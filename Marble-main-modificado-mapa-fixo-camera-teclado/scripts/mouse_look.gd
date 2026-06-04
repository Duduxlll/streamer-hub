class_name MouseLook

extends Node3D

@export var sensitivity := 0.4
@export var min_angle := -90
@export var max_angle := 90
@export var capture_mouse := false
@export var distance := 5.0

var _yaw := 0.0
var _pitch := 0.0


func _ready() -> void:
	if capture_mouse:
		Input.set_mouse_mode(Input.MOUSE_MODE_VISIBLE)


func _unhandled_input(_event: InputEvent) -> void:
	# Mouse look desligado. Câmera livre usa teclado.


func update_rotations() -> void:
	set_position(Vector3.ZERO)
	set_rotation(Vector3(0, deg_to_rad(_yaw), 0))
	rotate(get_transform().basis.x.normalized(), -deg_to_rad(_pitch))
	set_position(get_transform().basis.z * distance)
