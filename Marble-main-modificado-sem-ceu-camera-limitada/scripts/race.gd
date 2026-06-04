@tool
class_name Race
extends Node

# Constants and resource paths
const PieceList = preload("res://scripts/constants/piece_list.gd")
const Group = preload("res://scripts/constants/groups.gd")

# Mapa fixo completo:
# índices baseados em PieceList.PIECES:
# 0 forward_down
# 1 turn_left_2
# 2 turn_left_3
# 3 turn_right_2
# 4 turn_right_3
# 5 hopper
# 6 bumper
#
# A pista fica sempre igual, com curva, descida e obstáculos leves.
const FIXED_TRACK_SEQUENCE := [0, 1, 0, 6, 3, 0, 5, 2, 0, 4, 0]


# Escala geral das peças da pista.
# TODAS as peças usam a mesma escala.
# A escala muda conforme a quantidade de bolinhas.
var _track_scale: float = 3.2
var _step_count: int = FIXED_TRACK_SEQUENCE.size()

func configure_for_marble_count(amount: int) -> void:
	# Mapa fixo completo, sem sorteio.
	# Escala aumenta só para caber mais bolinhas na largada.
	if amount <= 80:
		_track_scale = 2.8
	elif amount <= 120:
		_track_scale = 3.15
	elif amount <= 180:
		_track_scale = 3.45
	else:
		_track_scale = 3.75

	_step_count = FIXED_TRACK_SEQUENCE.size()


var _previous_piece = null
var _previous_piece_orientation = null
var _previous_rotation_index := 0

# Curve to store the race path
@onready var curve: Curve3D = Curve3D.new()

# Reference to the path node
@onready var path := get_node(^"Path") as Path3D


static func umod(x: int, d: int) -> int:
	if x < 0:
		return (x + 1) % d + d - 1
	return x % d


func _ready() -> void:
	# Initialize the curve and set it to the path
	path.set_curve(curve)

	# Check if explosion is enabled from settings
	var explosion_enabled = SettingsManager.get_value(&"marbles", &"explosion_enabled") as bool
	generate_race(!explosion_enabled)


func clear_previous_pieces() -> void:
	# Limpa peças antigas antes de gerar uma nova corrida.
	# Mantém o Path3D da cena e remove apenas blocos/peças da pista.
	for child in get_children():
		if child == path:
			continue

		if child is Piece:
			remove_child(child)
			child.queue_free()

	curve.clear_points()
	_previous_piece = null
	_previous_piece_orientation = null
	_previous_rotation_index = 0


# Main function to generate the race
func generate_race(with_end: bool = true) -> void:
	# Clear previous race path
	curve.clear_points()
	# Clear previous pieces from the scene
	clear_previous_pieces()
	# Place the start line
	place_start_line()

	# Generate a race chunk
	generate_chunk()

	# Place the finish line if required
	if with_end:
		place_finish_line()


# Function to generate a race chunk
func generate_chunk() -> void:
	# Mapa fixo completo:
	# não sorteia peças; coloca sempre a mesma sequência.
	for piece_index in FIXED_TRACK_SEQUENCE:
		place_piece(piece_index)


# Function to select a random piece index
func randomize_piece_index() -> int:
	return Race.umod(randi(), len(PieceList.PIECES) - 2)


# Function to place the start line
func place_start_line() -> void:
	place_piece(-2)


# Function to place the finish line
func place_finish_line() -> void:
	place_piece(-1)


# Function to place a piece on the race path
func place_piece(piece_index: int) -> void:
	# Instantiate the piece
	var piece_data = PieceList.PIECES[piece_index]
	var piece: Piece = piece_data[&"resource"].instantiate()
	# Todas as peças do mapa fixo usam a mesma escala.
	piece.scale = Vector3.ONE * _track_scale

	# Optimize piece visibility
	optimize_piece_visibility(piece)

	# Add the piece to the scene
	add_child(piece)

	# Rotate and translate the piece
	rotate_piece(piece)
	translate_piece(piece)

	# # randomize_power(piece)

	# Store data for next piece and positions for the race path
	store_piece_data(piece, piece_data)
	store_piece_positions(piece)


# Function to optimize piece visibility
func optimize_piece_visibility(piece: Piece) -> void:
	for node in piece.find_children("*", "MeshInstance3D", true, false):
		if node is MeshInstance3D:
			node.visibility_range_end = 900
			node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
			node.gi_mode = GeometryInstance3D.GI_MODE_DISABLED


# Function to rotate a piece based on previous orientation
func rotate_piece(piece: Piece) -> void:
	var rotation_index = calculate_rotation_index(piece)
	piece.rotate_y(float(rotation_index) * PI / 2.0)


# Function to calculate the rotation index for a piece
func calculate_rotation_index(_piece: Piece) -> int:
	var rotation_index = _previous_rotation_index
	if _previous_piece_orientation == PieceList.TURN_LEFT:
		rotation_index = (rotation_index + 1) % 4
	elif _previous_piece_orientation == PieceList.TURN_RIGHT:
		rotation_index = (rotation_index - 1) % 4
	return rotation_index


# Function to translate a piece based on previous piece position
func translate_piece(piece: Piece) -> void:
	var offset = calculate_translation_offset(piece)
	piece.global_translate(offset)


# Function to calculate the translation offset for a piece
func calculate_translation_offset(piece: Piece) -> Vector3:
	var offset = Vector3(-10, 25, 0)
	if _previous_piece != null:
		offset = (
			_previous_piece.get_end().global_transform.origin
			- piece.get_begin().global_transform.origin
		)
	return offset


# Function to enable randomly power on the piece
func randomize_power(piece: Piece) -> void:
	var power = piece.get_node_or_null("Power")
	var r := randf()
	if power and r > 0.5:
		power.toggle(true)
		power.set_type(power.PowerType.BOOST)


# Function to store data for the next piece
func store_piece_data(piece: Piece, piece_data: Dictionary) -> void:
	_previous_piece = piece
	_previous_rotation_index = calculate_rotation_index(piece)
	_previous_piece_orientation = piece_data[&"next_piece_orientation"]


# Function to store positions for the race path
func store_piece_positions(piece: Piece) -> void:
	var positions := piece.get_node(^"Positions") as Marker3D
	if positions:
		for pos in positions.get_children():
			curve.add_point(pos.global_position)
