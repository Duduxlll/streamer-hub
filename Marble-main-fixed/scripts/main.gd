class_name Main
extends Node

enum State { MODE_START, MODE_PAUSE, MODE_MARBLE }

const RotationCameraScene := preload("res://scenes/camera/rotation_camera.tscn")
const MarbleCameraScene := preload("res://scenes/camera/marble_camera.tscn")
const SpectatorCameraScene := preload("res://scenes/camera/spectator_camera.tscn")
const MarbleScene := preload("res://scenes/marble.tscn")
const Group := preload("res://scripts/constants/groups.gd")
const NameGenerator := preload("res://scripts/utils/name_generator.gd")

const TIME_PERIOD := 5  # 500ms
const STUCK_SPEED_THRESHOLD := 0.08
const STUCK_MOVE_THRESHOLD := 0.08
const STUCK_NUDGE_AFTER := 3.0
const STUCK_OUT_AFTER := 8.0
const SLOW_SPEED_THRESHOLD := 0.7
const SLOW_PROGRESS_AFTER := 1.15
const SLOW_ASSIST_COOLDOWN := 0.75
const SLOW_ASSIST_SPEED := 1.85
const NO_PROGRESS_NUDGE_AFTER := 5.0
const NO_PROGRESS_OUT_AFTER := 12.0
const NO_PROGRESS_RADIUS := 2.4

var _rotation_camera = null
var _marble_camera = null
var _spectator_camera = null
var _mode: int = State.MODE_START
var _current_marble_index := -1
var _time := 0.0
var _explosion_enabled := false
var _race_has_started := false
var _race_completed := false
var _lower_boundary = null
var _winner_limit := 5
var _active_race_count := 0
var _finish_order := []
var _external_names := PackedStringArray()
var _speed_scale := 1.0
var _speed_buttons := []
var _speed_panel: PanelContainer = null
var _stuck_tracker := {}

# Variables used in explosion mode to check
# if we need to generate another chunk of the race
var _max_checkpoint_count := -1
var _old_lap_count := 0

# There are limited places to ensure equality among the marbles.
# TODO : remove this limit
var _positions := []

@onready var _pause_menu := get_node(^"%Menu") as Menu
@onready var _race := get_node(^"%Race") as Race
@onready var _overlay := get_node(^"%Overlay") as Overlay
@onready var _marble_pool := get_node(^"%MarblePool") as Node3D
@onready var _timer := get_node(^"%Timer") as Timer
@onready var _ranking := get_tree().get_nodes_in_group(&"Ranking")[0] as Ranking
@onready var _explosion := get_node(^"%Explosion") as GPUParticles3D
@onready var _marbles = _marble_pool.get_children()
@onready var _panel_timer := _overlay.get_node(^"Panel2") as ColorRect
@onready var _label_timer = _overlay.get_node(^"Panel2/CenterContainer3/VBoxContainer/LabelTimer")
@onready var _countdown := get_node(^"%Countdown")
@onready var _podium := get_node(^"%Podium")


func _ready() -> void:
	add_to_group(&"race_main")
	_rotation_camera = RotationCameraScene.instantiate()
	_marble_camera = MarbleCameraScene.instantiate()
	_spectator_camera = SpectatorCameraScene.instantiate()
	_load_web_race_data()
	build_speed_controls()
	set_speed_scale(1.0)
	reset_position(maxi(14, len(_pause_menu.get_names())))
	set_mode(_mode)
	_post_web_event(&"marble:ready")


func _exit_tree():
	Engine.time_scale = 1.0
	if not _rotation_camera.is_inside_tree():
		_rotation_camera.free()
	if not _marble_camera.is_inside_tree():
		_marble_camera.free()
	if not _spectator_camera.is_inside_tree():
		_spectator_camera.free()


func _unhandled_input(event):
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_RIGHT and _mode == State.MODE_MARBLE:
			activate_free_camera()
		elif event.button_index == MOUSE_BUTTON_LEFT and _mode == State.MODE_MARBLE:
			var picked_marble = pick_marble(event.position)
			if picked_marble != null:
				focus_marble(picked_marble)

	if event is InputEventKey:
		if event.pressed:
			match event.keycode:
				KEY_1:
					set_speed_scale(1.0)

				KEY_2:
					set_speed_scale(2.0)

				KEY_3:
					set_speed_scale(3.0)

				KEY_TAB:
					if _mode == State.MODE_MARBLE:
						focus_next_ranked_marble()

				KEY_W, KEY_A, KEY_S, KEY_D:
					if _mode == State.MODE_MARBLE and _marble_camera.is_inside_tree():
						activate_free_camera()

				KEY_ESCAPE:
					if _mode != State.MODE_START and _mode != State.MODE_PAUSE:
						set_mode(State.MODE_PAUSE)

				KEY_F:
					if _mode == State.MODE_MARBLE:
						activate_free_camera()

				# Debug command to spawn a new marble
				KEY_T:
					if _mode == State.MODE_MARBLE:
						var all_marble_has_finish = true
						for marble in _marbles:
							all_marble_has_finish = marble.has_finish()
							if not all_marble_has_finish:
								break

						if all_marble_has_finish:
							_overlay.reset()
							reset_position()

						var marble = try_place_start_marble()
						if marble != null:
							marble.set_marble_name(NameGenerator.generate())
							_overlay.add_marble_rank(marble)

				# Debug command to generate a new race
				KEY_R:
					if _mode == State.MODE_MARBLE:
						_race.generate_race(!_explosion_enabled)
						_lower_boundary = get_lowest_piece(_race, true).global_transform.origin.y

				KEY_SPACE:
					for marble in _marbles:
						var marble_name = marble.get_marble_name().to_lower()
						if marble_name == &"maxime" or marble_name == &"max":
							marble.set_linear_velocity(-marble.linear_velocity * 2)
							break


# Reset marble positions
func reset_position(count: int = 14) -> void:
	_positions = []
	var safe_count = maxi(1, count)
	var lanes = clampi(ceili(sqrt(float(safe_count) * 2.0)), 2, 12)
	var rows = ceili(float(safe_count) / float(lanes))
	for row in range(rows):
		for lane in range(lanes):
			_positions.append([
				float(lane) - (float(lanes) - 1.0) / 2.0,
				float(row) - (float(rows) - 1.0) / 2.0,
			])


func ensure_marble_capacity(count: int) -> void:
	while _marble_pool.get_child_count() < count:
		var marble = MarbleScene.instantiate()
		marble.name = "Marble%d" % (_marble_pool.get_child_count() + 1)
		marble.visible = false
		_marble_pool.add_child(marble)
	_marbles = _marble_pool.get_children()


# Try placing a new marble on the start line
func try_place_start_marble() -> Marble:
	var piece = get_highest_piece()
	if piece == null:
		return null
	if len(_positions) == 0:
		reset_position(maxi(_active_race_count, _marble_pool.get_child_count()))
	randomize()
	var position = _positions.pop_at(randi() % len(_positions))

	var new_marble = null
	for marble in _marbles:
		if not marble.visible:
			new_marble = marble
			break

	if new_marble == null:
		new_marble = MarbleScene.instantiate()
		new_marble.visible = false
		_marble_pool.add_child(new_marble)
		_marbles = _marble_pool.get_children()

	new_marble.position = (
		piece.position
		+ Vector3.UP * 5
		+ Vector3.FORWARD * float(position[0]) * 0.5
		+ Vector3.RIGHT * float(position[1]) * 0.64
	)
	new_marble.roll()
	return new_marble


# Get the highest piece in the race
func get_highest_piece() -> Piece:
	var pieces = _race.get_children()
	if len(pieces) == 0:
		return null
	var highest_piece = null
	for piece in pieces:
		if not piece is Piece:
			continue
		if highest_piece == null:
			highest_piece = piece
		elif piece.position.y > highest_piece.position.y:
			highest_piece = piece
	return highest_piece


func get_lowest_piece(piece_or_race, recursive: bool = false) -> Piece:
	var pieces = piece_or_race.get_children()
	if len(pieces) == 0:
		return null

	# Find the lower piece from children of the current node3d
	var lowest_piece = null
	for piece in pieces:
		if not piece is Piece:
			continue
		if lowest_piece == null:
			lowest_piece = piece
		elif piece.position.y < lowest_piece.position.y:
			lowest_piece = piece

	if recursive:
		var child_lowest_piece = get_lowest_piece(lowest_piece)
		if child_lowest_piece != null:
			lowest_piece = child_lowest_piece
	return lowest_piece


# Replace cameras with a new one
func replace_camera(new_camera, _old_cameras = []) -> void:
	# Ensure old cameras are removed from the current scene
	for camera in [_rotation_camera, _marble_camera, _spectator_camera]:
		if camera != null and camera != new_camera and camera.is_inside_tree():
			Main.remove_from_tree(camera)
	# And create a new one
	if not new_camera.is_inside_tree():
		add_child(new_camera)


func build_speed_controls() -> void:
	if _speed_panel != null:
		return

	_speed_panel = PanelContainer.new()
	_speed_panel.name = "SpeedControls"
	_speed_panel.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	_speed_panel.offset_left = -178.0
	_speed_panel.offset_top = 20.0
	_speed_panel.offset_right = -20.0
	_speed_panel.offset_bottom = 62.0
	_speed_panel.mouse_filter = Control.MOUSE_FILTER_STOP

	var box = HBoxContainer.new()
	box.add_theme_constant_override(&"separation", 6)
	_speed_panel.add_child(box)

	for speed in [1, 2, 3]:
		var button = Button.new()
		button.text = "%dx" % speed
		button.toggle_mode = true
		button.focus_mode = Control.FOCUS_NONE
		button.custom_minimum_size = Vector2(48, 32)
		button.set_meta(&"speed", speed)
		button.pressed.connect(_on_speed_button_pressed.bind(float(speed)))
		box.add_child(button)
		_speed_buttons.append(button)

	add_child(_speed_panel)


func _on_speed_button_pressed(speed: float) -> void:
	set_speed_scale(speed)


func set_speed_scale(speed: float) -> void:
	_speed_scale = clampf(speed, 1.0, 3.0)
	Engine.time_scale = _speed_scale
	update_speed_buttons()


func update_speed_buttons() -> void:
	for button in _speed_buttons:
		var speed = float(button.get_meta(&"speed", 1))
		button.button_pressed = is_equal_approx(speed, _speed_scale)


func focus_marble(marble: Marble) -> void:
	if marble == null or not is_instance_valid(marble):
		return
	_marble_camera.set_target(marble)
	replace_camera(_marble_camera)


func focus_next_ranked_marble() -> void:
	var ranked_marbles := []
	if _ranking.has_method(&"get_ranked_marbles"):
		ranked_marbles = _ranking.get_ranked_marbles()
	else:
		ranked_marbles = _marbles

	var visible_marbles := []
	for marble in ranked_marbles:
		if marble is Marble and marble.visible:
			visible_marbles.append(marble)

	var marble_count = len(visible_marbles)
	if marble_count == 0:
		printerr("No marble to focus on!")
		return

	_current_marble_index = (_current_marble_index + 1) % marble_count
	focus_marble(visible_marbles[_current_marble_index] as Marble)


func activate_free_camera() -> void:
	var current_camera = get_viewport().get_camera_3d()
	var current_transform := Transform3D.IDENTITY
	var has_current_transform := false
	if current_camera != null:
		current_transform = current_camera.global_transform
		has_current_transform = true

	replace_camera(_spectator_camera)
	if has_current_transform and _spectator_camera.has_method(&"snap_to_transform"):
		_spectator_camera.snap_to_transform(current_transform)
	elif current_camera != null and _spectator_camera.has_method(&"snap_to_camera"):
		_spectator_camera.snap_to_camera(current_camera)
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)


func place_free_camera_at_start() -> void:
	var start_piece = get_highest_piece()
	if start_piece == null:
		activate_free_camera()
		return
	replace_camera(_spectator_camera)
	if _spectator_camera.has_method(&"place_at"):
		var target = start_piece.global_position + Vector3.UP * 4.0
		_spectator_camera.place_at(target + Vector3(0, 8, 18), target)
	Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)


func pick_marble(screen_position: Vector2) -> Marble:
	var camera = get_viewport().get_camera_3d()
	if camera == null:
		return null
	var from = camera.project_ray_origin(screen_position)
	var to = from + camera.project_ray_normal(screen_position) * 1000.0
	var query = PhysicsRayQueryParameters3D.create(from, to)
	query.collide_with_bodies = true
	var result = camera.get_world_3d().direct_space_state.intersect_ray(query)
	if result.has("collider") and result["collider"] is Marble:
		return result["collider"] as Marble
	return null


func _on_timer_timeout():
	# Release SceneTree
	get_tree().set_pause(false)
	_timer.start()
	_race_has_started = true

	# Put the camera at the right place for the start
	place_free_camera_at_start()


# Set the game mode
func set_mode(mode):
	var start_a_new_race = false

	if mode != _mode:
		if _mode == State.MODE_PAUSE or _mode == State.MODE_START:
			# For each start action, delete all marbles
			if _pause_menu.is_start() or _pause_menu.is_quit():
				start_a_new_race = true
				for marble in _marbles:
					marble.pause()

				# Ensure the timer is reset
				_race_has_started = false
				_race_completed = false
				_timer.set_wait_time(10)
				_timer.stop()

			# Ensure that the pause menu is closed
			if _pause_menu.visible:
				_pause_menu.close()

	_mode = mode

	if _mode == State.MODE_MARBLE:
		# If no marbles exist
		if start_a_new_race:
			_podium.hide()

			await Fade.fade_out(1, Color.BLACK, "Diamond", false, false).finished

			_explosion_enabled = SettingsManager.get_value(&"marbles", &"explosion_enabled") as bool
			_race.generate_race(!_explosion_enabled)
			_lower_boundary = get_lowest_piece(_race, true).global_transform.origin.y

			# Reset values at each new race
			_max_checkpoint_count = -1
			_old_lap_count = 0

			_overlay.reset()
			var names = _pause_menu.get_names()
			ensure_marble_capacity(len(names))
			reset_position(len(names))
			_finish_order = []
			_stuck_tracker.clear()
			_race_completed = false
			_active_race_count = len(names)
			_winner_limit = mini(maxi(1, _winner_limit), maxi(1, _active_race_count))
			_current_marble_index = -1

			# Show HUD
			_overlay.show()

			# Put the camera at the right place for the start
			replace_camera(_rotation_camera)

			# Focus the rotation camera on the marble start line
			_rotation_camera.target = get_highest_piece().global_position + Vector3.UP * 5
			_rotation_camera.distance_to_target = 10.0

			if len(names) > 0:
				# Stop SceneTree, to make all the marbles leave at the same time
				get_tree().set_pause(true)

				# Create one marble for each name
				for marble_name in _pause_menu.get_names():
					var marble = try_place_start_marble()
					if marble == null:
						break
					marble.set_marble_name(marble_name)
					_overlay.add_marble_rank(marble)
					_marble_camera.set_target(marble)

			await Fade.fade_in(1, Color.BLACK, "Diamond", false, false).finished
			_countdown.connect("countdown_finished", _on_timer_timeout, CONNECT_ONE_SHOT)
			_countdown.start()

		else:
			_overlay.show()

			replace_camera(_marble_camera)

	elif _mode == State.MODE_START:
		_overlay.hide()
		_pause_menu.open_start_menu()
		replace_camera(_rotation_camera)
		# Focus the rotation camera on race
		_rotation_camera.target = Vector3.ZERO
		_rotation_camera.distance_to_target = 50.0

	elif _mode == State.MODE_PAUSE:
		_pause_menu.open_pause_menu()
		replace_camera(_rotation_camera)
		# Focus the rotation camera on race
		_rotation_camera.target = Vector3.ZERO
		_rotation_camera.distance_to_target = 50.0


# Remove a node from the scene tree
static func remove_from_tree(node):
	node.get_parent().remove_child(node)


func _process(delta):
	_time += delta

	if _time > TIME_PERIOD:
		if _mode == State.MODE_START:
			# Regenerate race
			_race.generate_race(true)

			# Reset timer
			_time = 0

	if _mode != State.MODE_START and _explosion_enabled:
		var time_left := _timer.get_time_left()

		_panel_timer.show()
		_label_timer.set_text("%d:%02d" % [floor((time_left + 1) / 60), int(time_left + 1) % 60])

		if time_left == 0.0 and _race_has_started:
			_timer.start()

			if _ranking._last_marble != null:
				var skip := explosion_victory(_ranking._last_marble)

				if !skip:
					_ranking._last_marble.explode()

					_explosion.global_position = _ranking._last_marble.global_position
					_explosion.set_emitting(true)

		if _ranking._first_marble:
			# If a new checkpoint is crossed by the first marble
			if _ranking._first_marble._checkpoint_count > _max_checkpoint_count:
				# Store the max number of checkpoints crossed
				_max_checkpoint_count = _ranking._first_marble._checkpoint_count

				# Compute the lap (1 lap equals  to one chunk)
				var lap_count := ceili(_max_checkpoint_count / (_race._step_count - 3.0))
				# If one more lap was done
				if lap_count > _old_lap_count:
					# Generate a chunk
					_race.generate_chunk()
					_lower_boundary = get_lowest_piece(_race, true).global_transform.origin.y
					_old_lap_count = lap_count
	else:
		_panel_timer.hide()

	if not _pause_menu.visible:
		if _mode == State.MODE_PAUSE or _mode == State.MODE_START:
			set_mode(State.MODE_MARBLE)
	else:
		if _mode == State.MODE_PAUSE and _pause_menu.is_quit():
			set_mode(State.MODE_START)

	if not _marble_camera.has_target() or not _marble_camera.get_target().visible:
		var found = false
		for marble in _marbles:
			if marble.visible:
				found = true
				_marble_camera.set_target(marble)
				break
		if not found:
			replace_camera(_rotation_camera)

			if _race_has_started:
				complete_race()

	if _race_has_started and not _race_completed:
		update_finish_order()
		update_stuck_marbles(delta)

	# Check if some marbles are out of bound
	if _race_has_started and _lower_boundary != null:
		for marble in _marbles:
			if (
				marble.visible
				and marble._state == Marble.State.ROLL
				and marble.global_transform.origin.y + 18 < _lower_boundary
			):
				marble.out_of_bound()
				_stuck_tracker.erase(marble.get_instance_id())


func register_finish(marble: Marble) -> void:
	if _race_completed or marble == null:
		return
	_stuck_tracker.erase(marble.get_instance_id())
	if not _finish_order.has(marble):
		_finish_order.append(marble)

	var required_winners = mini(maxi(1, _winner_limit), maxi(1, _active_race_count))
	if _race_has_started and len(_finish_order) >= required_winners:
		complete_race()


func update_stuck_marbles(delta: float) -> void:
	for marble in _marbles:
		if not marble is Marble:
			continue

		var id = marble.get_instance_id()
		if not marble.visible or not marble.in_race():
			_stuck_tracker.erase(id)
			continue

		var pos = marble.global_position
		var checkpoint = marble.get_checkpoint_count()
		var data = _stuck_tracker.get(id, {
			"position": pos,
			"checkpoint_position": pos,
			"time": 0.0,
			"checkpoint_time": 0.0,
			"slow_time": 0.0,
			"slow_cooldown": 0.0,
			"nudged": false,
			"progress_nudged": false,
			"checkpoint": checkpoint,
		})

		if int(data.get("checkpoint", -1)) != checkpoint:
			data["position"] = pos
			data["checkpoint_position"] = pos
			data["time"] = 0.0
			data["checkpoint_time"] = 0.0
			data["slow_time"] = 0.0
			data["slow_cooldown"] = 0.0
			data["nudged"] = false
			data["progress_nudged"] = false
			data["checkpoint"] = checkpoint
			_stuck_tracker[id] = data
			continue

		var old_position = data.get("position", pos) as Vector3
		var checkpoint_position = data.get("checkpoint_position", pos) as Vector3
		var moved = pos.distance_to(old_position)
		var checkpoint_distance = pos.distance_to(checkpoint_position)
		var speed = marble.linear_velocity.length()
		data["checkpoint_time"] = float(data.get("checkpoint_time", 0.0)) + delta
		data["slow_cooldown"] = maxf(0.0, float(data.get("slow_cooldown", 0.0)) - delta)

		if checkpoint_distance >= NO_PROGRESS_RADIUS:
			data["checkpoint_position"] = pos
			data["checkpoint_time"] = 0.0
			data["slow_time"] = 0.0
			data["progress_nudged"] = false
			checkpoint_distance = 0.0

		if moved < STUCK_MOVE_THRESHOLD and speed < STUCK_SPEED_THRESHOLD:
			data["time"] = float(data.get("time", 0.0)) + delta
		else:
			data["position"] = pos
			data["time"] = 0.0
			data["nudged"] = false

		if speed < SLOW_SPEED_THRESHOLD and checkpoint_distance < NO_PROGRESS_RADIUS:
			data["slow_time"] = float(data.get("slow_time", 0.0)) + delta
		else:
			data["slow_time"] = 0.0

		data["checkpoint"] = checkpoint

		var stuck_time = float(data.get("time", 0.0))
		if stuck_time >= STUCK_OUT_AFTER:
			marble.out_of_bound()
			_stuck_tracker.erase(id)
			continue

		if stuck_time >= STUCK_NUDGE_AFTER and not bool(data.get("nudged", false)):
			nudge_stuck_marble(marble)
			data["nudged"] = true
			data["time"] = STUCK_NUDGE_AFTER

		if (
			float(data.get("slow_time", 0.0)) >= SLOW_PROGRESS_AFTER
			and float(data.get("slow_cooldown", 0.0)) <= 0.0
		):
			assist_slow_marble(marble)
			data["slow_time"] = 0.0
			data["slow_cooldown"] = SLOW_ASSIST_COOLDOWN

		var no_progress_time = float(data.get("checkpoint_time", 0.0))
		if no_progress_time >= NO_PROGRESS_OUT_AFTER and checkpoint_distance < NO_PROGRESS_RADIUS:
			marble.out_of_bound()
			_stuck_tracker.erase(id)
			continue

		if (
			no_progress_time >= NO_PROGRESS_NUDGE_AFTER
			and checkpoint_distance < NO_PROGRESS_RADIUS
			and not bool(data.get("progress_nudged", false))
		):
			nudge_stuck_marble(marble)
			data["progress_nudged"] = true

		_stuck_tracker[id] = data


func assist_slow_marble(marble: Marble) -> void:
	var direction = get_race_flow_direction(marble.global_position)
	var spread = Vector3(randf_range(-0.18, 0.18), 0.0, randf_range(-0.18, 0.18))
	var push = (direction + spread + Vector3.DOWN * 0.2).normalized()
	marble.set_sleeping(false)
	if marble.linear_velocity.length() < SLOW_ASSIST_SPEED:
		marble.set_linear_velocity(push * SLOW_ASSIST_SPEED)
	else:
		marble.set_linear_velocity(marble.linear_velocity + push * 0.65)
	marble.angular_velocity += Vector3(randf_range(-1.2, 1.2), 0.0, randf_range(-1.2, 1.2))


func nudge_stuck_marble(marble: Marble) -> void:
	var direction = get_race_flow_direction(marble.global_position)
	var spread = Vector3(randf_range(-0.35, 0.35), 0.0, randf_range(-0.35, 0.35))
	var push = (direction + spread + Vector3.DOWN * 0.15).normalized()
	marble.global_position = marble.global_position + Vector3.UP * 0.45 + spread
	marble.set_sleeping(false)
	marble.set_linear_velocity(push * 4.5)


func get_race_flow_direction(position: Vector3) -> Vector3:
	if _race == null or _race.curve == null or _race.path == null:
		return Vector3.DOWN

	var curve = _race.curve
	var point_count = curve.get_point_count()
	if point_count < 2:
		return Vector3.DOWN

	var path_transform = _race.path.global_transform
	var best_index := 0
	var best_distance := 999999999.0
	for i in range(point_count):
		var curve_point = curve.get_point_position(i)
		var global_point = path_transform.origin + path_transform.basis * curve_point
		var distance = position.distance_squared_to(global_point)
		if distance < best_distance:
			best_distance = distance
			best_index = i

	var target_index = mini(best_index + 1, point_count - 1)
	var target_point = curve.get_point_position(target_index)
	var target = path_transform.origin + path_transform.basis * target_point
	var direction = target - position
	if direction.length_squared() < 0.01:
		direction = Vector3.DOWN

	if direction.y > -0.15:
		direction.y = -0.15
	return direction.normalized()


func collect_finished_marbles() -> void:
	for marble in _marbles:
		if marble is Marble and marble.has_finish() and not _finish_order.has(marble):
			_finish_order.append(marble)


func update_finish_order() -> void:
	collect_finished_marbles()

	var required_winners = mini(maxi(1, _winner_limit), maxi(1, _active_race_count))
	if len(_finish_order) >= required_winners:
		complete_race()


func complete_race() -> void:
	if _race_completed:
		return
	collect_finished_marbles()
	_race_completed = true
	_race_has_started = false

	for marble in _marbles:
		if marble is Marble and marble.visible and not marble.has_finish():
			marble.pause()

	_podium.show()
	_podium.set_first(_ranking._first_marble)
	_podium.set_second(_ranking._second_marble)
	_podium.set_third(_ranking._third_marble)
	_post_web_event(&"marble:finish", { "winners": get_winner_payload() })


func get_winner_payload() -> Array:
	var winners := []
	if len(_finish_order) == 0 and _ranking.has_method(&"get_ranked_marbles"):
		for marble in _ranking.get_ranked_marbles():
			if marble is Marble and not _finish_order.has(marble):
				_finish_order.append(marble)

	var max_count = mini(len(_finish_order), maxi(1, _winner_limit))
	for i in range(max_count):
		var marble = _finish_order[i] as Marble
		winners.append({
			"place": i + 1,
			"name": str(marble.get_marble_name()),
		})
	return winners


func _load_web_race_data() -> void:
	var raw = _eval_js("""
(function() {
	try {
		var data = window.GORJETA_RACE_DATA || window.GORGITA_RACE_DATA || window.CORRIDA_DADOS_JSON;
		if (!data && window.parent) data = window.parent.GORJETA_RACE_DATA || window.parent.GORGITA_RACE_DATA || window.parent.CORRIDA_DADOS_JSON;
		if (!data && window.localStorage) {
			var stored = window.localStorage.getItem('corrida-race-data');
			if (stored) {
				var race = JSON.parse(stored);
				var participants = Array.isArray(race.participants) ? race.participants : [];
				var top = Number(race.numVencedores || race.topN || race.top || race.maxVencedores || 5);
				data = {
					jogadores: participants.map(function(player) {
						return player.displayName || player.username || '';
					}).filter(Boolean),
					participants: participants,
					players: participants,
					topN: top,
					numVencedores: top,
					top: top,
					maxVencedores: top
				};
			}
		}
		return typeof data === 'string' ? data : JSON.stringify(data || null);
	} catch (e) {
		return '';
	}
})()
""")
	if typeof(raw) != TYPE_STRING or String(raw).strip_edges() == "" or String(raw) == "null":
		return

	var parsed = JSON.parse_string(String(raw))
	if typeof(parsed) != TYPE_DICTIONARY:
		return

	var names := PackedStringArray()
	if parsed.has("jogadores") and parsed["jogadores"] is Array:
		for name in parsed["jogadores"]:
			var clean_name = String(name).strip_edges()
			if clean_name != "":
				names.push_back(clean_name)
	elif parsed.has("participants") and parsed["participants"] is Array:
		for player in parsed["participants"]:
			if player is Dictionary:
				var clean_name = String(player.get("displayName", player.get("username", ""))).strip_edges()
				if clean_name != "":
					names.push_back(clean_name)
	elif parsed.has("players") and parsed["players"] is Array:
		for player in parsed["players"]:
			if player is Dictionary:
				var clean_name = String(player.get("displayName", player.get("username", ""))).strip_edges()
				if clean_name != "":
					names.push_back(clean_name)

	for key in ["topN", "numVencedores", "top", "maxVencedores"]:
		if parsed.has(key):
			_winner_limit = maxi(1, int(parsed[key]))
			break

	if len(names) > 0:
		_external_names = names
		_pause_menu.configure_for_gorgita(_external_names, _winner_limit)


func _eval_js(source: String):
	if not Engine.has_singleton(&"JavaScriptBridge"):
		return null
	return Engine.get_singleton(&"JavaScriptBridge").eval(source, true)


func _post_web_event(event_type: StringName, payload: Dictionary = {}) -> void:
	var message = JSON.stringify({ "type": str(event_type), "payload": payload })
	var script = "try { var msg = %s; if (window.parent) window.parent.postMessage(msg, '*'); } catch (e) {}" % JSON.stringify(message)
	_eval_js(script)


# Handle victory conditions on explosion mode
func explosion_victory(_last_marble: Marble) -> bool:
	var marble_exploded_count := 0
	var tmp_marble = null

	for marble in _marbles:
		if marble.in_race() and marble.visible:
			marble_exploded_count += 1
			if _last_marble != marble:
				tmp_marble = marble

		if marble_exploded_count > 2:
			break

	if marble_exploded_count == 2:
		tmp_marble.finish()

	if marble_exploded_count == 1:
#		_last_marble.finish()
		return true

	if marble_exploded_count == 0:
		return true

	return false
