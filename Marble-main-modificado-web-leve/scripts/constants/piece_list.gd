const FORWARD := 1
const TURN_LEFT := 2
const TURN_RIGHT := 3

# Lista leve para Web.
# Removidos temporariamente:
# - hopper
# - hopper2
# - hopper3
# - bumper
# - turn_left_covered
# - turn_right_covered
#
# Se a versão leve ficar estável, dá para adicionar obstáculos aos poucos depois.
const PIECES := [
	{
		&"resource": preload("res://scenes/blocks/forward_down.tscn"),
		&"next_piece_orientation": FORWARD
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
		&"resource": preload("res://scenes/blocks/turn_right_2.tscn"),
		&"next_piece_orientation": TURN_RIGHT
	},
	{
		&"resource": preload("res://scenes/blocks/turn_right_3.tscn"),
		&"next_piece_orientation": TURN_RIGHT
	},
	{
		&"resource": preload("res://scenes/blocks/start_line.tscn"),
		&"next_piece_orientation": FORWARD
	},
	{
		&"resource": preload("res://scenes/blocks/finish_line.tscn"),
		&"next_piece_orientation": FORWARD
	},
]
