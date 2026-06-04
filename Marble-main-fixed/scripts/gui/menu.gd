class_name Menu

extends Control

enum State { MODE_OFF, MODE_START, MODE_PAUSE }
enum Action { ACTION_NOOP, ACTION_START, ACTION_RESUME, ACTION_QUIT }

var _mode: int = State.MODE_START
var _last_action: int = Action.ACTION_NOOP
var _is_web_export := false
var _gorgita_mode := false
var _external_names := PackedStringArray()
var _top_n := 5
var _players_label: Label = null

@onready var _open_sound := get_node(^"%OpenSound") as AudioStreamPlayer
@onready var _input := get_node(^"%Input") as LineEdit
@onready var _start_button := get_node(^"%StartMenu") as Control
@onready var _pause_menu := get_node(^"%PauseMenu") as Control
@onready var _quit_button := _start_button.get_node(^"VBoxContainer/QuitButton") as Button
@onready var _title_label := _start_button.get_node(^"VBoxContainer/Label") as Label
@onready var _start_action_button := _start_button.get_node(^"VBoxContainer/StartButton") as Button
@onready var _build_info := _start_button.get_node(^"VBoxContainer/BuildInfo") as Label
@onready var _collision_toggle := get_node(^"%CollisionToggle") as CheckButton
@onready var _explosion_toggle := get_node(^"%ExplosionToggle") as CheckButton


func _ready() -> void:
	_input.set_text(SettingsManager.get_value(&"marbles", &"marble_names"))
	_collision_toggle.button_pressed = SettingsManager.get_value(&"marbles", &"collision_enabled")
	_explosion_toggle.button_pressed = SettingsManager.get_value(&"marbles", &"explosion_enabled")

	_is_web_export = OS.get_name() == "HTML5" or OS.get_name() == "Web"
	set_mode(_mode)


func _on_StartButton_pressed() -> void:
	_last_action = Action.ACTION_START
	set_mode(State.MODE_OFF)


func _on_ResumeButton_pressed() -> void:
	_last_action = Action.ACTION_RESUME
	set_mode(State.MODE_OFF)


func _on_QuitButton_pressed() -> void:
	if _gorgita_mode:
		_post_back_to_gorgita()
		return
	_last_action = Action.ACTION_QUIT
	if _mode == State.MODE_START:
		get_tree().quit()
	elif _mode == State.MODE_PAUSE:
		set_mode(State.MODE_START)


func _on_CollisionToggle_toggled(pressed: bool):
	_collision_toggle.button_pressed = pressed
	SettingsManager.set_value(&"marbles", &"collision_enabled", pressed)


func _on_ExplosionToggle_toggled(pressed: bool):
	_explosion_toggle.button_pressed = pressed
	SettingsManager.set_value(&"marbles", &"explosion_enabled", pressed)


func _notification(what: int) -> void:
	match what:
		NOTIFICATION_VISIBILITY_CHANGED:
			if visible and _open_sound:
				_open_sound.play()


func get_names() -> PackedStringArray:
	if len(_external_names) > 0:
		return _external_names
	var input_text = _input.get_text()
	if input_text:
		return input_text.split(",")
	return PackedStringArray()


func configure_for_gorgita(names: PackedStringArray, top_n: int) -> void:
	_gorgita_mode = true
	_external_names = names
	_top_n = maxi(1, top_n)
	_input.set_text(",".join(_external_names))
	SettingsManager.set_value(&"marbles", &"collision_enabled", false)
	SettingsManager.set_value(&"marbles", &"explosion_enabled", false)
	_apply_gorgita_ui()


func _apply_gorgita_ui() -> void:
	if not is_node_ready():
		return
	_title_label.set_text("Corrida do stainzin")
	_start_action_button.set_text("Iniciar corrida")
	_input.hide()
	_collision_toggle.hide()
	_explosion_toggle.hide()
	_quit_button.hide()
	_build_info.hide()

	var container = _start_button.get_node(^"VBoxContainer") as VBoxContainer
	if _players_label == null:
		_players_label = Label.new()
		_players_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_players_label.clip_text = true
		_players_label.custom_minimum_size = Vector2(0, 140)
		_players_label.vertical_alignment = VERTICAL_ALIGNMENT_TOP
		container.add_child(_players_label)

	var names_preview := PackedStringArray()
	var limit = mini(len(_external_names), 28)
	for i in range(limit):
		names_preview.push_back(_external_names[i])
	if len(_external_names) > limit:
		names_preview.push_back("+%d inscritos" % (len(_external_names) - limit))
	_players_label.set_text(
		"Inscritos: %d  |  Top %d\n%s"
		% [len(_external_names), mini(_top_n, maxi(1, len(_external_names))), ", ".join(names_preview)]
	)


func _post_back_to_gorgita() -> void:
	if not Engine.has_singleton(&"JavaScriptBridge"):
		return
	var message = JSON.stringify({ "type": "marble:backToTip", "payload": {} })
	var script = "try { var msg = %s; if (window.parent) window.parent.postMessage(msg, '*'); } catch (e) {}" % JSON.stringify(message)
	Engine.get_singleton(&"JavaScriptBridge").eval(script, true)


func set_mode(mode: int) -> void:
	_mode = mode

	if _mode == State.MODE_START:
		_start_button.show()
		_pause_menu.hide()

		if _is_web_export:
			_quit_button.disabled = true
	elif _mode == State.MODE_PAUSE:
		_start_button.hide()
		_pause_menu.show()

		if _is_web_export:
			_quit_button.disabled = false

	if _mode == State.MODE_OFF:
		hide()
		Input.set_mouse_mode(Input.MOUSE_MODE_CAPTURED)
	else:
		show()
		Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)


func open_start_menu() -> void:
	set_mode(State.MODE_START)


func open_pause_menu() -> void:
	set_mode(State.MODE_PAUSE)


func close() -> void:
	set_mode(State.MODE_OFF)


func is_start() -> bool:
	return _last_action == Action.ACTION_START


func is_resume() -> bool:
	return _last_action == Action.ACTION_RESUME


func is_quit() -> bool:
	return _last_action == Action.ACTION_QUIT


func _on_Input_text_changed(new_text):
	SettingsManager.set_value(&"marbles", &"marble_names", new_text)
