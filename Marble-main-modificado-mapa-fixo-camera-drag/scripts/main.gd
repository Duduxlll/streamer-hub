class_name Main
extends Node

enum State { MODE_START, MODE_PAUSE, MODE_MARBLE }

const RotationCameraScene := preload("res://scenes/camera/rotation_camera.tscn")
const MarbleCameraScene := preload("res://scenes/camera/marble_camera.tscn")
const FreeCameraScene := preload("res://scenes/camera/spectator_camera.tscn")
const MarbleScene := preload("res://scenes/marble.tscn")
const Group := preload("res://scripts/constants/groups.gd")
const NameGenerator := preload("res://scripts/utils/name_generator.gd")

const TIME_PERIOD := 5  # 500ms
const MAX_MARBLES := 180

var _rotation_camera = null
var _marble_camera = null
var _free_camera = null
var _free_camera_enabled := true
var _mode: int = State.MODE_START
var _current_marble_index := 0
var _time := 0.0
var _explosion_enabled := false
var _race_has_started := false
var _lower_boundary = null
var _start_rescue_elapsed := 0.0
var _speed_multiplier: int = 1
var _speed_buttons: Array[Button] = []
var _speed_label: Label = null

var _site_mode_enabled := true
var _site_players: PackedStringArray = PackedStringArray()
var _site_winner_limit: int = 5
var _site_finish_results: Array = []
var _site_race_active := false
var _site_layer: CanvasLayer = null
var _site_panel: PanelContainer = null
var _site_title: Label = null
var _site_subtitle: Label = null
var _site_top_label: Label = null
var _site_player_list: RichTextLabel = null
var _site_start_button: Button = null
var _site_back_button: Button = null
var _js_message_callback = null

var _camera_drag_enabled := false
var _camera_drag_sensitivity := 0.008

# Variables used in explosion mode to check
# if we need to generate another chunk of the race
var _max_checkpoint_count := -1
var _old_lap_count := 0

# There are limited places to ensure equality among the marbles.
# TODO : remove this limit
var _positions: Array = []

@onready var _pause_menu := get_node(^"%Menu") as Menu
@onready var _race := get_node(^"%Race") as Race
@onready var _overlay := get_node(^"%Overlay") as Overlay
@onready var _marble_pool := get_node(^"%MarblePool") as Node3D
@onready var _timer := get_node(^"%Timer") as Timer
@onready var _ranking := get_tree().get_nodes_in_group(&"Ranking")[0] as Ranking
var _explosion: GPUParticles3D = null
var _marbles := []
@onready var _panel_timer := _overlay.get_node(^"Panel2") as ColorRect
@onready var _label_timer = _overlay.get_node(^"Panel2/CenterContainer3/VBoxContainer/LabelTimer")
@onready var _countdown := get_node(^"%Countdown")
@onready var _podium := get_node(^"%Podium")


func _ready() -> void:
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	add_to_group("main")
	_rotation_camera = RotationCameraScene.instantiate()
	_marble_camera = MarbleCameraScene.instantiate()
	_free_camera = FreeCameraScene.instantiate()
	var initial_marble_count: int = max(Bridge.jogadores.size(), 1)
	ensure_marble_pool(initial_marble_count)
	_marbles = _marble_pool.get_children()
	reset_position(initial_marble_count)
	create_speed_controls()
	set_speed_multiplier(1)
	create_site_controls()
	setup_site_bridge()

	if Bridge.jogadores.size() > 0:
		load_site_players(Bridge.jogadores, Bridge.top_n)
	else:
		open_site_waiting()


func _exit_tree():
	Engine.time_scale = 1.0
	if not _rotation_camera.is_inside_tree():
		_rotation_camera.free()
	if not _marble_camera.is_inside_tree():
		_marble_camera.free()
	if not _free_camera.is_inside_tree():
		_free_camera.free()



func is_camera_drag_available() -> bool:
	if _mode != State.MODE_MARBLE:
		return false

	if _rotation_camera != null and _rotation_camera.is_inside_tree():
		return true

	if _marble_camera != null and _marble_camera.is_inside_tree():
		return true

	return false


func rotate_active_camera_by_mouse(relative: Vector2) -> void:
	var amount_x: float = -relative.x * _camera_drag_sensitivity
	var amount_y: float = -relative.y * _camera_drag_sensitivity

	if _rotation_camera != null and _rotation_camera.is_inside_tree():
		_rotation_camera.rotate_y(amount_x)
		_rotation_camera.rotate_object_local(Vector3.RIGHT, amount_y)
		return

	if _marble_camera != null and _marble_camera.is_inside_tree():
		_marble_camera.rotate_y(amount_x)
		_marble_camera.rotate_object_local(Vector3.RIGHT, amount_y)
		return


func _unhandled_input(event):

	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT or event.button_index == MOUSE_BUTTON_RIGHT:
			_camera_drag_enabled = event.pressed and is_camera_drag_available()
			Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
			get_viewport().set_input_as_handled()
			return

	if event is InputEventMouseMotion:
		if _camera_drag_enabled:
			rotate_active_camera_by_mouse(event.relative)
			Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
			get_viewport().set_input_as_handled()
			return

	if event is InputEventKey:
		if event.pressed:
			match event.keycode:
				KEY_W, KEY_A, KEY_S, KEY_D, KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT, KEY_Q, KEY_Z:
					if _mode == State.MODE_MARBLE and not _free_camera_enabled:
						_free_camera_enabled = true
						activate_free_camera()
						return

				KEY_X:
					cycle_speed_multiplier()

				KEY_1:
					set_speed_multiplier(1)

				KEY_2:
					set_speed_multiplier(2)

				KEY_3:
					set_speed_multiplier(3)

				KEY_C:
					if _mode == State.MODE_MARBLE:
						_free_camera_enabled = !_free_camera_enabled
						if _free_camera_enabled:
							activate_free_camera()
						else:
							replace_camera(_marble_camera, [_rotation_camera, _free_camera])

				KEY_TAB:
					if _mode == State.MODE_MARBLE:
						_free_camera_enabled = false
						var visible_marbles := []
						for marble in _marbles:
							if marble.visible:
								visible_marbles.append(marble)

						var marble_count = len(visible_marbles)
						if marble_count != 0:
							if _current_marble_index >= marble_count:
								_current_marble_index = 0
							else:
								_current_marble_index += 1
							_marble_camera.set_target(
								visible_marbles[_current_marble_index % marble_count]
							)

						else:
							printerr("No marble to focus on!")

				KEY_ESCAPE:
					Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)

				# Debug command to spawn a new marble
				KEY_T:
					if _mode == State.MODE_MARBLE and not _site_mode_enabled:
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
					if _mode == State.MODE_MARBLE and not _site_mode_enabled:
						var names_for_scale: Array = _pause_menu.get_names()
						var marble_amount_for_scale: int = max(len(names_for_scale), 1)
						if _race.has_method(&"configure_for_marble_count"):
							_race.configure_for_marble_count(marble_amount_for_scale)
						_race.generate_race(true)
						_lower_boundary = get_lowest_piece(_race, true).global_transform.origin.y

				KEY_SPACE:
					for marble in _marbles:
						var marble_name = marble.get_marble_name().to_lower()
						if marble_name == &"maxime" or marble_name == &"max":
							marble.set_linear_velocity(-marble.linear_velocity * 2)
							break


# Pool dinâmica de bolinhas.
# Antes o jogo criava 300 bolinhas no início, mesmo com 1 jogador.
# Agora cria só a quantidade real necessária e remove extras.
func ensure_marble_pool(amount: int) -> void:
	amount = clampi(amount, 1, MAX_MARBLES)

	while _marble_pool.get_child_count() > amount:
		var extra = _marble_pool.get_child(_marble_pool.get_child_count() - 1)
		_marble_pool.remove_child(extra)
		extra.queue_free()

	var current_count: int = _marble_pool.get_child_count()
	for i in range(current_count, amount):
		var marble = MarbleScene.instantiate()
		marble.name = "Marble%d" % (i + 1)
		_marble_pool.add_child(marble)

	_marbles = _marble_pool.get_children()

	for marble in _marbles:
		if marble.has_method("pause"):
			marble.pause()


# Reset marble positions.
# Largada segura para 100+ bolinhas.
# Mantém o estilo original: bolinhas juntas, retas e alinhadas dentro da caixa.
# A grade agora é mais estreita nas laterais e mais comprida no fundo,
# para evitar encostar a pontinha na parede.
func reset_position(amount: int = MAX_MARBLES) -> void:
	_positions = []

	var columns: int
	if amount <= 40:
		columns = 4
	elif amount <= 80:
		columns = 5
	elif amount <= 130:
		columns = 6
	elif amount <= 200:
		columns = 7
	else:
		columns = 8

	var rows: int = ceili(float(amount) / float(columns))
	var spacing: float = 0.78

	# O centro original do jogo ficava um pouco deslocado para um lado.
	# Esse offset evita nascer perto da parede da caixa.
	var side_offset: float = -0.45

	for row in range(rows):
		for col in range(columns):
			if len(_positions) >= amount:
				return

			var x: float = (float(col) - float(columns - 1) / 2.0) * spacing + side_offset
			var z: float = (float(row) - float(rows - 1) / 2.0) * spacing

			_positions.append(Vector3(x, 0.0, z))


# Try placing a new marble on the start line
func try_place_start_marble() -> Marble:
	var piece = get_highest_piece()
	if piece == null:
		return null
	if len(_positions) == 0:
		printerr("There are limited places to ensure equality among the marbles.")
		return null
	randomize()
	var position: Vector3 = _positions.pop_front()

	var new_marble = null
	for marble in _marbles:
		if not marble.visible:
			new_marble = marble
			break

	if new_marble == null:
		return null

	# Largada segura:
	# - grade estreita e alinhada
	# - altura calculada pela escala da peça
	# - velocidade zerada para não empurrar para a parede no primeiro frame
	var spawn_height: float = max(4.2, piece.scale.x * 1.38)

	new_marble.position = (
		piece.position
		+ Vector3.UP * spawn_height
		+ Vector3.FORWARD * position.z
		+ Vector3.RIGHT * position.x
	)

	new_marble.roll()
	new_marble.set_linear_velocity(Vector3.ZERO)
	new_marble.set_angular_velocity(Vector3.ZERO)
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
func replace_camera(new_camera, old_cameras) -> void:
	# Ensure old cameras are removed from the current scene
	for camera in old_cameras:
		if camera.is_inside_tree():
			Main.remove_from_tree(camera)
	# And create a new one
	if not new_camera.is_inside_tree():
		add_child(new_camera)


func activate_free_camera() -> void:
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	var target := Vector3.ZERO
	var start_position := Vector3(0, 18, 24)
	var highest_piece := get_highest_piece()
	if highest_piece != null:
		target = highest_piece.global_position + Vector3.UP * 2
		start_position = target + Vector3(0, 24, 42)
	replace_camera(_free_camera, [_rotation_camera, _marble_camera])
	if _free_camera.has_method(&"set_start_view"):
		_free_camera.set_start_view(start_position, target)


func _on_timer_timeout():
	# Release SceneTree
	get_tree().set_pause(false)
	_timer.start()
	_race_has_started = true

	# Put the camera at the right place for the start
	if _free_camera_enabled:
		activate_free_camera()
	else:
		replace_camera(_marble_camera, [_rotation_camera, _free_camera])


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

			# Fade removido porque o addon UniversalFade não veio no ZIP baixado do GitHub.
			await get_tree().process_frame

			_explosion_enabled = false

			var names_for_scale: Array = _pause_menu.get_names()
			var marble_amount_for_scale: int = max(len(names_for_scale), 1)
			if _race.has_method(&"configure_for_marble_count"):
				_race.configure_for_marble_count(marble_amount_for_scale)

			_race.generate_race(true)
			_lower_boundary = get_lowest_piece(_race, true).global_transform.origin.y

			# Reset values at each new race
			_max_checkpoint_count = -1
			_old_lap_count = 0
			_start_rescue_elapsed = 0.0
			_start_rescue_elapsed = 0.0


			var names = _pause_menu.get_names()
			ensure_marble_pool(min(MAX_MARBLES, max(len(names), 1)))
			_marbles = _marble_pool.get_children()

			_overlay.reset()
			reset_position(max(len(names), 1))

			# Show HUD
			_overlay.show()

			# Put the camera at the right place for the start
			replace_camera(_rotation_camera, [_marble_camera, _free_camera])

			# Focus the rotation camera on the marble start line
			_rotation_camera.target = get_highest_piece().global_position + Vector3.UP * 5
			_rotation_camera.distance_to_target = 72.0

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

			# Fade removido porque o addon UniversalFade não veio no ZIP baixado do GitHub.
			await get_tree().process_frame
			_countdown.connect("countdown_finished", _on_timer_timeout, CONNECT_ONE_SHOT)
			_countdown.start()

		else:
			_overlay.show()

			if _free_camera_enabled:
				activate_free_camera()
			else:
				replace_camera(_marble_camera, [_rotation_camera, _free_camera])

	elif _mode == State.MODE_START:
		set_speed_multiplier(1)
		_overlay.hide()
		_pause_menu.open_start_menu()
		replace_camera(_rotation_camera, [_marble_camera, _free_camera])
		# Focus the rotation camera on race
		_rotation_camera.target = Vector3.ZERO
		_rotation_camera.distance_to_target = 58.0

	elif _mode == State.MODE_PAUSE:
		_pause_menu.open_pause_menu()
		replace_camera(_rotation_camera, [_marble_camera, _free_camera])
		# Focus the rotation camera on race
		_rotation_camera.target = Vector3.ZERO
		_rotation_camera.distance_to_target = 58.0


# Remove a node from the scene tree
static func remove_from_tree(node):
	node.get_parent().remove_child(node)



func follow_marble_from_ranking(marble: Marble) -> void:
	if marble == null:
		return
	if not is_instance_valid(marble):
		return
	if not marble.visible:
		return

	_free_camera_enabled = false
	_marble_camera.set_target(marble)
	replace_camera(_marble_camera, [_rotation_camera, _free_camera])
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)



func create_site_controls() -> void:
	_site_layer = CanvasLayer.new()
	_site_layer.name = "SiteBridgeUI"
	_site_layer.layer = 120
	_site_layer.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(_site_layer)

	_site_panel = PanelContainer.new()
	_site_panel.name = "PainelAguardandoJogadores"
	_site_panel.process_mode = Node.PROCESS_MODE_ALWAYS
	_site_panel.custom_minimum_size = Vector2(520, 520)
	_site_panel.set_anchors_preset(Control.PRESET_CENTER)
	_site_panel.offset_left = -260
	_site_panel.offset_top = -260
	_site_panel.offset_right = 260
	_site_panel.offset_bottom = 260
	_site_layer.add_child(_site_panel)

	var box := VBoxContainer.new()
	box.process_mode = Node.PROCESS_MODE_ALWAYS
	box.add_theme_constant_override("separation", 12)
	_site_panel.add_child(box)

	_site_title = Label.new()
	_site_title.text = "Aguardando jogadores"
	_site_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_site_title.add_theme_font_size_override("font_size", 30)
	box.add_child(_site_title)

	_site_subtitle = Label.new()
	_site_subtitle.text = "Envie os participantes pelo site."
	_site_subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_site_subtitle.add_theme_font_size_override("font_size", 16)
	box.add_child(_site_subtitle)

	_site_top_label = Label.new()
	_site_top_label.text = "Ganhadores: Top 5"
	_site_top_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_site_top_label.add_theme_font_size_override("font_size", 18)
	box.add_child(_site_top_label)

	_site_player_list = RichTextLabel.new()
	_site_player_list.custom_minimum_size = Vector2(460, 290)
	_site_player_list.fit_content = false
	_site_player_list.scroll_active = true
	_site_player_list.add_theme_font_size_override("normal_font_size", 15)
	box.add_child(_site_player_list)

	var button_row := HBoxContainer.new()
	button_row.alignment = BoxContainer.ALIGNMENT_CENTER
	button_row.add_theme_constant_override("separation", 10)
	box.add_child(button_row)

	_site_start_button = Button.new()
	_site_start_button.text = "Iniciar corrida"
	_site_start_button.disabled = true
	_site_start_button.custom_minimum_size = Vector2(190, 44)
	_site_start_button.pressed.connect(start_site_race)
	button_row.add_child(_site_start_button)

	_site_back_button = Button.new()
	_site_back_button.text = "Voltar para gorjeta"
	_site_back_button.custom_minimum_size = Vector2(190, 44)
	_site_back_button.visible = false
	_site_back_button.pressed.connect(return_to_gorjeta)
	button_row.add_child(_site_back_button)

	update_site_waiting_ui()


func setup_site_bridge() -> void:
	if OS.has_feature("web") or OS.get_name() == "Web" or OS.get_name() == "HTML5":
		var window = JavaScriptBridge.get_interface("window")
		if window != null:
			_js_message_callback = JavaScriptBridge.create_callback(_on_site_message)
			window.addEventListener("message", _js_message_callback)
			send_site_event("marble:ready", {"message": "Godot pronto"})


func _on_site_message(args: Array) -> void:
	if len(args) == 0:
		return

	var event = args[0]
	var raw_data = event.data

	if typeof(raw_data) != TYPE_STRING:
		return

	var data = JSON.parse_string(raw_data)
	if typeof(data) != TYPE_DICTIONARY:
		return

	var message_type: String = str(data.get("type", ""))
	var payload = data.get("payload", data)

	if typeof(payload) != TYPE_DICTIONARY:
		payload = {}

	if message_type == "marble:init" or message_type == "marble:setPlayers":
		var players = payload.get("players", [])
		var top: int = int(payload.get("top", payload.get("winnerLimit", 5)))
		load_site_players(players, top)
	elif message_type == "marble:start":
		start_site_race()
	elif message_type == "marble:reset":
		open_site_waiting()
	elif message_type == "marble:speed":
		set_speed_multiplier(int(payload.get("value", 1)))


func send_site_event(message_type: String, payload: Dictionary = {}) -> void:
	if not (OS.has_feature("web") or OS.get_name() == "Web" or OS.get_name() == "HTML5"):
		return

	var window = JavaScriptBridge.get_interface("window")
	if window == null:
		return

	var message: Dictionary = {
		"type": message_type,
		"payload": payload
	}

	window.parent.postMessage(JSON.stringify(message), "*")


func open_site_waiting() -> void:
	_site_mode_enabled = true
	_site_race_active = false
	_site_finish_results = []
	_mode = State.MODE_START
	_race_has_started = false
	_start_rescue_elapsed = 0.0
	get_tree().set_pause(false)
	set_speed_multiplier(1)

	if _pause_menu != null:
		_pause_menu.hide()
	if _overlay != null:
		_overlay.hide()
	if _podium != null:
		_podium.hide()

	for marble in _marbles:
		marble.pause()

	# Na espera, não gera pista 3D pesada.
	# A pista só é gerada ao iniciar a corrida.
	if _race.has_method("clear_previous_pieces"):
		_race.clear_previous_pieces()

	replace_camera(_rotation_camera, [_marble_camera, _free_camera])
	_rotation_camera.target = Vector3.ZERO
	_rotation_camera.distance_to_target = 58.0

	if _site_layer != null:
		_site_layer.show()

	update_site_waiting_ui()
	send_site_event("marble:waiting", {"count": len(_site_players), "top": _site_winner_limit})


func load_demo_players() -> void:
	var demo_players: Array = []
	for i in range(100):
		demo_players.append("Jogador %03d" % (i + 1))
	load_site_players(demo_players, 5)


func load_site_players(players, winner_limit: int = 5) -> void:
	_site_players = PackedStringArray()

	for raw_player in players:
		var player_name: String = str(raw_player).strip_edges()
		if player_name == "":
			continue
		if len(_site_players) >= MAX_MARBLES:
			break
		_site_players.append(player_name)

	_site_winner_limit = clampi(winner_limit, 1, 50)
	Bridge.jogadores = Array(_site_players)
	Bridge.top_n = _site_winner_limit
	ensure_marble_pool(max(len(_site_players), 1))
	_marbles = _marble_pool.get_children()
	_site_finish_results = []
	_site_race_active = false

	open_site_waiting()
	update_site_waiting_ui()
	send_site_event("marble:loaded", {"count": len(_site_players), "top": _site_winner_limit})


func update_site_waiting_ui() -> void:
	if _site_title == null:
		return

	var count: int = len(_site_players)

	if count == 0:
		_site_title.text = "Aguardando jogadores"
		_site_subtitle.text = "Abra a entrada no site e envie os nomes para o jogo."
	else:
		_site_title.text = "%d jogadores carregados" % count
		_site_subtitle.text = "Tudo pronto. Clique em Iniciar corrida quando quiser."

	_site_top_label.text = "Ganhadores: Top %d" % _site_winner_limit
	_site_start_button.visible = true
	_site_start_button.disabled = count == 0
	if _site_back_button != null:
		_site_back_button.visible = false

	var text: String = ""
	var limit: int = mini(count, 120)

	for i in range(limit):
		text += "%03d. %s\n" % [i + 1, _site_players[i]]

	if count > limit:
		text += "\n... e mais %d jogadores" % (count - limit)

	if text == "":
		text = "Nenhum jogador carregado ainda."

	_site_player_list.text = text


func start_site_race() -> void:
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	if len(_site_players) == 0:
		return

	ensure_marble_pool(len(_site_players))
	_marbles = _marble_pool.get_children()

	_site_layer.hide()
	_pause_menu.hide()
	_podium.hide()

	get_tree().set_pause(false)
	_mode = State.MODE_MARBLE
	_site_race_active = true
	_site_finish_results = []
	_race_has_started = false
	_start_rescue_elapsed = 0.0

	for marble in _marbles:
		marble.pause()

	_explosion_enabled = false

	if _race.has_method(&"configure_for_marble_count"):
		_race.configure_for_marble_count(len(_site_players))

	_race.generate_race(true)
	_lower_boundary = get_lowest_piece(_race, true).global_transform.origin.y

	_max_checkpoint_count = -1
	_old_lap_count = 0

	_overlay.reset()
	reset_position(len(_site_players))
	_overlay.show()

	replace_camera(_rotation_camera, [_marble_camera, _free_camera])
	_rotation_camera.target = get_highest_piece().global_position + Vector3.UP * 5
	_rotation_camera.distance_to_target = 72.0

	get_tree().set_pause(true)

	for marble_name in _site_players:
		var marble = try_place_start_marble()
		if marble == null:
			break
		marble.set_marble_name(marble_name)
		_overlay.add_marble_rank(marble)
		_marble_camera.set_target(marble)

	send_site_event("marble:started", {"count": len(_site_players), "top": _site_winner_limit})

	_countdown.connect("countdown_finished", _on_timer_timeout, CONNECT_ONE_SHOT)
	_countdown.start()


func register_finish(marble: Marble) -> void:
	if not _site_race_active:
		return

	var marble_name: String = str(marble.get_marble_name())

	for item in _site_finish_results:
		if str(item.get("name", "")) == marble_name:
			return

	var result: Dictionary = {
		"place": len(_site_finish_results) + 1,
		"name": marble_name
	}

	_site_finish_results.append(result)
	send_site_event("marble:place", {"result": result, "results": _site_finish_results})

	if len(_site_finish_results) >= _site_winner_limit:
		finish_site_race()


func finish_site_race() -> void:
	Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
	if not _site_race_active:
		return

	_site_race_active = false
	_race_has_started = false
	get_tree().set_pause(false)
	_timer.stop()
	set_speed_multiplier(1)

	for marble in _marbles:
		if marble.visible and not marble.has_finish():
			marble.pause()

	_overlay.hide()
	_site_layer.show()

	_site_title.text = "Corrida finalizada"
	_site_subtitle.text = "Top final da corrida"
	_site_top_label.text = "Top %d completo" % _site_winner_limit
	_site_start_button.visible = false
	_site_start_button.disabled = true
	if _site_back_button != null:
		_site_back_button.visible = true

	var text: String = ""
	for item in _site_finish_results:
		text += "#%d  %s\n" % [int(item.get("place", 0)), str(item.get("name", ""))]

	_site_player_list.text = text

	var nomes_vencedores: Array = []
	for item in _site_finish_results:
		nomes_vencedores.append(str(item.get("name", "")))

	Bridge.enviar_resultado(nomes_vencedores)
	send_site_event("marble:finish", {"winners": _site_finish_results, "top": _site_winner_limit})



func return_to_gorjeta() -> void:
	var nomes_vencedores: Array = []
	for item in _site_finish_results:
		nomes_vencedores.append(str(item.get("name", "")))

	Bridge.enviar_resultado(nomes_vencedores)

	send_site_event("marble:backToTip", {
		"winners": _site_finish_results,
		"top": _site_winner_limit
	})



func create_speed_controls() -> void:
	var layer := CanvasLayer.new()
	layer.name = "ControlesVelocidade"
	layer.layer = 80
	layer.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(layer)

	var panel := PanelContainer.new()
	panel.name = "PainelVelocidade"
	panel.process_mode = Node.PROCESS_MODE_ALWAYS
	panel.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	panel.offset_left = -260
	panel.offset_top = 18
	panel.offset_right = -18
	panel.offset_bottom = 78
	layer.add_child(panel)

	var box := HBoxContainer.new()
	box.process_mode = Node.PROCESS_MODE_ALWAYS
	box.add_theme_constant_override("separation", 8)
	panel.add_child(box)

	_speed_label = Label.new()
	_speed_label.text = "Velocidade"
	_speed_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_speed_label.custom_minimum_size = Vector2(86, 36)
	box.add_child(_speed_label)

	for speed in [1, 2, 3]:
		var button := Button.new()
		button.text = "%dx" % speed
		button.toggle_mode = true
		button.custom_minimum_size = Vector2(44, 36)
		button.process_mode = Node.PROCESS_MODE_ALWAYS
		button.pressed.connect(set_speed_multiplier.bind(speed))
		box.add_child(button)
		_speed_buttons.append(button)


func set_speed_multiplier(multiplier: int) -> void:
	_speed_multiplier = clampi(multiplier, 1, 3)
	Engine.time_scale = float(_speed_multiplier)
	update_speed_buttons()


func cycle_speed_multiplier() -> void:
	if _speed_multiplier >= 3:
		set_speed_multiplier(1)
	else:
		set_speed_multiplier(_speed_multiplier + 1)


func update_speed_buttons() -> void:
	if _speed_label != null:
		_speed_label.text = "Velocidade %dx" % _speed_multiplier

	for i in range(len(_speed_buttons)):
		var expected_speed := i + 1
		_speed_buttons[i].button_pressed = expected_speed == _speed_multiplier



func _process(delta):
	_time += delta

	if _time > TIME_PERIOD:
		if _mode == State.MODE_START and not _site_mode_enabled:
			# Regenerate race
			_race.generate_race(true)

			# Reset timer
			_time = 0

	if false and _mode != State.MODE_START and _explosion_enabled:
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

	if not _site_mode_enabled:
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
			replace_camera(_rotation_camera, [_marble_camera, _free_camera])

			if _race_has_started:
				_race_has_started = false
				_podium.show()
				_podium.set_first(_ranking._first_marble)
				_podium.set_second(_ranking._second_marble)
				_podium.set_third(_ranking._third_marble)

	# Corrige bolinhas que ficam presas na parede/topo da largada
	if _race_has_started:
		rescue_start_stuck_marbles(delta)

	# Check if some marbles are out of bound
	if _race_has_started and _lower_boundary != null:
		for marble in _marbles:
			if (
				marble.visible
				and marble._state == Marble.State.ROLL
				and marble.global_transform.origin.y + 100 < _lower_boundary
			):
				marble.out_of_bound()



# Corrige bolinhas presas na borda/parede da largada nos primeiros segundos.
# Não espalha para o alto. Recoloca em grade, dentro da caixa.
func rescue_start_stuck_marbles(delta: float) -> void:
	if _start_rescue_elapsed > 20.0:
		return

	_start_rescue_elapsed += delta

	var piece = get_highest_piece()
	if piece == null:
		return

	var center: Vector3 = piece.position
	var scale_value: float = max(piece.scale.x, 1.0)
	var spawn_height: float = max(4.2, scale_value * 1.38)

	# Limites seguros dentro da caixa. 
	# Se a bolinha ficar lenta perto da parede, ela volta para dentro da grade.
	var side_min: float = -2.25 * scale_value + 0.55
	var side_max: float = 1.65 * scale_value - 0.55
	var front_limit: float = 3.25 * scale_value - 0.65

	var rescued_index: int = 0

	for marble in _marbles:
		if not marble.visible:
			continue
		if marble._state != Marble.State.ROLL:
			continue

		var rel: Vector3 = marble.position - center
		var horizontal_distance: float = Vector2(rel.x, rel.z).length()

		var near_start: bool = horizontal_distance < 5.8 * scale_value
		var slow: bool = marble.linear_velocity.length() < 0.55
		var too_high_and_stuck: bool = marble.position.y > center.y + spawn_height + 1.8 and slow
		var touching_side_wall: bool = (rel.x < side_min or rel.x > side_max) and slow
		var touching_front_wall: bool = abs(rel.z) > front_limit and slow

		if near_start and (too_high_and_stuck or touching_side_wall or touching_front_wall):
			var col: int = rescued_index % 6
			var row: int = rescued_index / 6
			var x: float = (float(col) - 2.5) * 0.78 - 0.45
			var z: float = (float(row) - 4.0) * 0.78
			rescued_index += 1

			marble.position = center + Vector3.UP * spawn_height + Vector3.RIGHT * x + Vector3.FORWARD * z
			marble.set_linear_velocity(Vector3.ZERO)
			marble.set_angular_velocity(Vector3.ZERO)


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
