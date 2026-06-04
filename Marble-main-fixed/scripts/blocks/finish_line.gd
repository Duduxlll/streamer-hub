class_name FinishLine

extends Area3D

const Group := preload("res://scripts/constants/groups.gd")

@onready var _player := get_node(^"%Sound") as AudioStreamPlayer3D


func _on_Area_body_entered(body: PhysicsBody3D) -> void:
	# If a marble collide
	if body.is_in_group(Group.MARBLES):
		# Play the final sound
		_player.play()

		body.finish()
		var main = get_tree().get_first_node_in_group(&"race_main")
		if main != null and main.has_method(&"register_finish"):
			main.register_finish(body as Marble)
