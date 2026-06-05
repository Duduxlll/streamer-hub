const FORWARD := 1
const TURN_LEFT := 2
const TURN_RIGHT := 3

const PIECES := [
	{
		&"resource": preload("res://scenes/blocks/forward_down.tscn"),
		&"next_piece_orientation": FORWARD
	},
	{
		&"resource": preload("res://scenes/blocks/turn_left_covered.tscn"),
		&"next_piece_orientation": TURN_LEFT
	},
	{
		&"resource": preload("res://scenes/blocks/turn_left_2.tscn"),
		&"next_piece_orientation": TURN_LEFT
	},
	{
		&"resource": preload("res://scenes/blocks/turn_left_3.tscn"),
		&"next_piece_orientation": TURN_LEFT
	},
	{
		&"resource": preload("res://scenes/blocks/turn_right_covered.tscn"),
		&"next_piece_orientation": TURN_RIGHT
	},
	{
		&"resource": preload("res://scenes/blocks/turn_right_2.tscn"),
		&"next_piece_orientation": TURN_RIGHT
	},
	{
		&"resource": preload("res://scenes/blocks/turn_right_3.tscn"),
		&"next_piece_orientation": TURN_RIGHT
	},
	{&"resource": preload("res://scenes/blocks/hopper.tscn"), &"next_piece_orientation": FORWARD},
	{&"resource": preload("res://scenes/blocks/hopper2.tscn"), &"next_piece_orientation": FORWARD},
	{&"resource": preload("res://scenes/blocks/hopper3.tscn"), &"next_piece_orientation": FORWARD},
	{&"resource": preload("res://scenes/blocks/bumper.tscn"), &"next_piece_orientation": FORWARD},
	{
		&"resource": preload("res://scenes/blocks/start_line.tscn"),
		&"next_piece_orientation": FORWARD
	},
	{
		&"resource": preload("res://scenes/blocks/finish_line.tscn"),
		&"next_piece_orientation": FORWARD
	},
]
