@tool
class_name Race
extends Node

const PieceList = preload("res://scripts/constants/piece_list.gd")
const Group = preload("res://scripts/constants/groups.gd")

@export var regenerate_race: bool:
	set = generate_race

var _step_count := 10

var _previous_piece = null
var _previous_piece_orientation = null
var _previous_rotation_index := 0

@onready var curve: Curve3D = Curve3D.new()

@onready var path := get_node(^"Path") as Path3D


static func umod(x: int, d: int) -> int:
	if x < 0:
		return (x + 1) % d + d - 1
	return x % d


func _ready() -> void:
	path.set_curve(curve)

	var explosion_enabled = SettingsManager.get_value(&"marbles", &"explosion_enabled") as bool
	generate_race(!explosion_enabled)


func generate_race(with_end: bool = true) -> void:
	curve.clear_points()
	clear_previous_pieces()
	place_start_line()

	generate_chunk()

	if with_end:
		place_finish_line()


func generate_chunk() -> void:
	randomize()

	for _i in range(_step_count):
		var piece_index = randomize_piece_index()
		place_piece(piece_index)


func clear_previous_pieces() -> void:
	_previous_piece = null
	_previous_piece_orientation = null
	_previous_rotation_index = 0

	for piece in get_children():
		if piece.is_in_group(Group.PIECES):
			piece.queue_free()


func randomize_piece_index() -> int:
	return Race.umod(randi(), len(PieceList.PIECES) - 2)


func place_start_line() -> void:
	place_piece(-2)


func place_finish_line() -> void:
	place_piece(-1)


func place_piece(piece_index: int) -> void:
	var piece_data = PieceList.PIECES[piece_index]
	var piece: Piece = piece_data[&"resource"].instantiate()

	optimize_piece_visibility(piece)

	add_child(piece)

	rotate_piece(piece)
	translate_piece(piece)

	randomize_power(piece)

	store_piece_data(piece, piece_data)
	store_piece_positions(piece)


func optimize_piece_visibility(piece: Piece) -> void:
	for child in piece.get_children():
		if child is MeshInstance3D:
			child.visibility_range_end = 150


func rotate_piece(piece: Piece) -> void:
	var rotation_index = calculate_rotation_index(piece)
	piece.rotate_y(float(rotation_index) * PI / 2.0)


func calculate_rotation_index(_piece: Piece) -> int:
	var rotation_index = _previous_rotation_index
	if _previous_piece_orientation == PieceList.TURN_LEFT:
		rotation_index = (rotation_index + 1) % 4
	elif _previous_piece_orientation == PieceList.TURN_RIGHT:
		rotation_index = (rotation_index - 1) % 4
	return rotation_index


func translate_piece(piece: Piece) -> void:
	var offset = calculate_translation_offset(piece)
	piece.global_translate(offset)


func calculate_translation_offset(piece: Piece) -> Vector3:
	var offset = Vector3(-10, 25, 0)
	if _previous_piece != null:
		offset = (
			_previous_piece.get_end().global_transform.origin
			- piece.get_begin().global_transform.origin
		)
	return offset


func randomize_power(piece: Piece) -> void:
	var power = piece.get_node_or_null("Power")
	var r := randf()
	if power and r > 0.5:
		power.toggle(true)
		power.set_type(power.PowerType.BOOST)


func store_piece_data(piece: Piece, piece_data: Dictionary) -> void:
	_previous_piece = piece
	_previous_rotation_index = calculate_rotation_index(piece)
	_previous_piece_orientation = piece_data[&"next_piece_orientation"]


func store_piece_positions(piece: Piece) -> void:
	var positions := piece.get_node(^"Positions") as Marker3D
	if positions:
		for pos in positions.get_children():
			curve.add_point(pos.global_position)
