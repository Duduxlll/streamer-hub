extends Node

enum Type { RANDOM, SINE, NOISE }

var camera_shake_intensity = 0.0
var camera_shake_duration = 0.0

var camera_shake_type = Type.RANDOM

var noise: FastNoiseLite


func _ready():
	noise = FastNoiseLite.new()
	noise.seed = randi()
	noise.domain_warp_fractal_octaves = 4
	noise.domain_warp_frequency = 20
	noise.domain_warp_fractal_lacunarity = 0.8


func shake(intensity, duration, type = Type.RANDOM):

	if intensity > camera_shake_intensity and duration > camera_shake_duration:
		camera_shake_intensity = intensity
		camera_shake_duration = duration
		camera_shake_type = type


func _process(delta):
	var camera := get_viewport().get_camera_3d() as Camera3D
	if not is_instance_valid(camera):
		return

	if camera_shake_duration <= 0:
		camera.h_offset = 0.0
		camera.v_offset = 0.0
		camera_shake_intensity = 0.0
		camera_shake_duration = 0.0
		return

	camera_shake_duration = camera_shake_duration - delta

	var offset = Vector2.ZERO

	if camera_shake_type == Type.RANDOM:
		offset = Vector2(randf(), randf()) * camera_shake_intensity

	if camera_shake_type == Type.SINE:
		offset = (
			Vector2(sin(Time.get_ticks_msec() * 0.03), sin(Time.get_ticks_msec() * 0.07))
			* camera_shake_intensity
			* 0.5
		)

	if camera_shake_type == Type.NOISE:
		var noise_value_x = noise.get_noise_1d(Time.get_ticks_msec() * 0.1)
		var noise_value_y = noise.get_noise_1d(Time.get_ticks_msec() * 0.1 + 100.0)
		offset = Vector2(noise_value_x, noise_value_y) * camera_shake_intensity * 2.0

	camera.h_offset = offset.x
	camera.v_offset = offset.y
