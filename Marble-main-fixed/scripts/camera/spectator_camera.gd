class_name SpectatorCamera

extends Node3D

@export var speed := 10.0

@onready var _camera := get_node(^"%Camera") as Camera3D


func snap_to_camera(camera: Camera3D) -> void:
	if camera == null:
		return
	global_position = camera.global_position
	_camera.global_rotation = camera.global_rotation
	if _camera.has_method(&"sync_from_current_rotation"):
		_camera.sync_from_current_rotation()


func snap_to_transform(camera_transform: Transform3D) -> void:
	global_position = camera_transform.origin
	_camera.global_transform = camera_transform
	_camera.position = Vector3.ZERO
	if _camera.has_method(&"sync_from_current_rotation"):
		_camera.sync_from_current_rotation()


func place_at(position: Vector3, target: Vector3) -> void:
	global_position = position
	_camera.look_at(target, Vector3.UP)
	if _camera.has_method(&"sync_from_current_rotation"):
		_camera.sync_from_current_rotation()


func _physics_process(delta: float) -> void:
	var forward = -_camera.transform.basis.z
	var right = _camera.transform.basis.x
	var up = Vector3.UP

	var dir = Vector3.ZERO

	if Input.is_key_pressed(KEY_Q) or Input.is_key_pressed(KEY_A):
		dir -= right

	elif Input.is_key_pressed(KEY_D):
		dir += right

	if Input.is_key_pressed(KEY_Z) or Input.is_key_pressed(KEY_W):
		dir += forward

	elif Input.is_key_pressed(KEY_S):
		dir -= forward

	if Input.is_key_pressed(KEY_SHIFT):
		dir -= up

	elif Input.is_key_pressed(KEY_SPACE):
		dir += up

	var dir_len = dir.length()
	if dir_len > 0.01:
		dir /= dir_len
		translate(dir * (speed * delta))
