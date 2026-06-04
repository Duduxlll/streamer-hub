class_name FinishLine

extends Area3D

const Group := preload("res://scripts/constants/groups.gd")

@onready var _player := get_node(^"%Sound") as AudioStreamPlayer3D


func _on_Area_body_entered(body: PhysicsBody3D) -> void:
	# If a marble collide
	if body.is_in_group(Group.MARBLES):
		# Play the final sound
		_player.play()

		var main_node = get_tree().get_first_node_in_group("main")
		if main_node != null and main_node.has_method("register_finish"):
			main_node.register_finish(body)

		body.finish()
