class_name Menu

extends Control

enum State { MODE_OFF, MODE_START, MODE_PAUSE }
enum Action { ACTION_NOOP, ACTION_START, ACTION_RESUME, ACTION_QUIT }

const MAX_MARBLES := 300

var _mode: int = State.MODE_START
var _last_action: int = Action.ACTION_NOOP
var _is_web_export := false

@onready var _open_sound := get_node(^"%OpenSound") as AudioStreamPlayer
@onready var _input := get_node(^"%Input") as LineEdit
@onready var _start_button := get_node(^"%StartMenu") as Control
@onready var _pause_menu := get_node(^"%PauseMenu") as Control
@onready var _quit_button := _start_button.get_node(^"VBoxContainer/QuitButton") as Button
@onready var _collision_toggle := get_node(^"%CollisionToggle") as CheckButton
var _explosion_toggle: CheckButton = null


func _ready() -> void:
	_input.set_text(SettingsManager.get_value(&"marbles", &"marble_names"))
	if _input.get_text().strip_edges() == "":
		_input.set_text("100")
	_collision_toggle.button_pressed = SettingsManager.get_value(&"marbles", &"collision_enabled")
	pass

	_is_web_export = OS.get_name() == "HTML5"
	set_mode(_mode)


func _on_StartButton_pressed() -> void:
	_last_action = Action.ACTION_START
	set_mode(State.MODE_OFF)


func _on_ResumeButton_pressed() -> void:
	_last_action = Action.ACTION_RESUME
	set_mode(State.MODE_OFF)


func _on_QuitButton_pressed() -> void:
	_last_action = Action.ACTION_QUIT
	if _mode == State.MODE_START:
		pass
	elif _mode == State.MODE_PAUSE:
		set_mode(State.MODE_START)


func _on_CollisionToggle_toggled(pressed: bool):
	_collision_toggle.button_pressed = pressed
	SettingsManager.set_value(&"marbles", &"collision_enabled", pressed)


func _on_ExplosionToggle_toggled(_pressed: bool):
	pass

func _notification(what: int) -> void:
	match what:
		NOTIFICATION_VISIBILITY_CHANGED:
			if visible and _open_sound:
				_open_sound.play()


func get_names() -> PackedStringArray:
	var input_text := _input.get_text().strip_edges()
	if input_text:
		if input_text.is_valid_int():
			var amount := clampi(input_text.to_int(), 1, MAX_MARBLES)
			var generated_names := PackedStringArray()
			for i in range(amount):
				generated_names.append("Jogador %03d" % (i + 1))
			return generated_names

		input_text = input_text.replace("\r\n", ",")
		input_text = input_text.replace("\n", ",")
		var raw_names := input_text.split(",")
		var names := PackedStringArray()
		for raw_name in raw_names:
			var name := raw_name.strip_edges()
			if name != "":
				names.append(name)
			if len(names) >= MAX_MARBLES:
				break
		return names
	return PackedStringArray()


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
		Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)
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
