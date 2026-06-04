class_name SpectatorCamera

extends Node3D

@export var speed := 12.0
@export var fast_multiplier := 3.0
@export var sensitivity := 0.12
@export var capture_mouse := false
@export var min_pitch := -89.0
@export var max_pitch := 89.0

var _yaw := 0.0
var _pitch := -18.0

@onready var _camera := get_node(^"%Camera") as Camera3D


func _ready() -> void:
	_camera.current = true
	_apply_rotation()
	if capture_mouse:
		Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)


func set_start_view(camera_position: Vector3, target: Vector3) -> void:
	global_position = camera_position
	var dir := (target - camera_position).normalized()
	_yaw = rad_to_deg(atan2(-dir.x, -dir.z))
	_pitch = rad_to_deg(asin(dir.y))
	_apply_rotation()


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.pressed and capture_mouse and Input.get_mouse_mode() != Input.MOUSE_MODE_CAPTURED:
			Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)

	elif event is InputEventMouseMotion:
		if capture_mouse and Input.get_mouse_mode() == Input.MOUSE_MODE_CAPTURED:
			_yaw -= event.relative.x * sensitivity
			_pitch -= event.relative.y * sensitivity
			_pitch = clampf(_pitch, min_pitch, max_pitch)
			_apply_rotation()


func _physics_process(delta: float) -> void:
	var forward := -transform.basis.z
	var right := transform.basis.x
	var up := Vector3.UP
	var dir := Vector3.ZERO

	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP) or Input.is_key_pressed(KEY_Z):
		dir += forward
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		dir -= forward
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT) or Input.is_key_pressed(KEY_Q):
		dir -= right
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		dir += right
	if Input.is_key_pressed(KEY_E) or Input.is_key_pressed(KEY_SPACE):
		dir += up
	if Input.is_key_pressed(KEY_SHIFT) or Input.is_key_pressed(KEY_CTRL):
		dir -= up

	if dir.length() > 0.01:
		dir = dir.normalized()
		var current_speed := speed
		if Input.is_key_pressed(KEY_ALT):
			current_speed *= fast_multiplier
		global_translate(dir * current_speed * delta)


func _apply_rotation() -> void:
	rotation = Vector3(deg_to_rad(_pitch), deg_to_rad(_yaw), 0.0)
	_camera.rotation = Vector3.ZERO
