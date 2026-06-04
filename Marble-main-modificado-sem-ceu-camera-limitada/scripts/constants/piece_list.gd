const FORWARD := 1
const TURN_LEFT := 2
const TURN_RIGHT := 3

# Peças disponíveis para a pista fixa.
# A corrida NÃO vai sortear aleatoriamente.
# race.gd usa uma sequência fixa dessas peças, formando um mapa completo.
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
		&"resource": preload("res://scenes/blocks/hopper.tscn"),
		&"next_piece_orientation": FORWARD
	},
	{
		&"resource": preload("res://scenes/blocks/bumper.tscn"),
		&"next_piece_orientation": FORWARD
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
