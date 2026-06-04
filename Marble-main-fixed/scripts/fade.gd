extends CanvasLayer

var _rect: ColorRect
var _tween: Tween


func _enter_tree() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	layer = 4096


func _ready() -> void:
	_build_rect()
	get_tree().root.size_changed.connect(_resize)
	_resize()


func fade_out(duration: float = 1.0, color: Color = Color.BLACK, _pattern: String = "", _invert: bool = false, _smooth: bool = false) -> Tween:
	return _fade(duration, color, 0.0, color.a, false)


func fade_in(duration: float = 1.0, color: Color = Color.BLACK, _pattern: String = "", _invert: bool = false, _smooth: bool = false) -> Tween:
	return _fade(duration, color, color.a, 0.0, true)


func _build_rect() -> void:
	if _rect != null:
		return

	_rect = ColorRect.new()
	_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_rect.color = Color.BLACK
	_rect.modulate.a = 0.0
	_rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_rect.hide()
	add_child(_rect)


func _resize() -> void:
	if _rect == null:
		return

	_rect.size = get_viewport().get_visible_rect().size


func _fade(duration: float, color: Color, from_alpha: float, to_alpha: float, hide_when_done: bool) -> Tween:
	_build_rect()

	if _tween != null and _tween.is_valid():
		_tween.kill()

	_rect.color = Color(color.r, color.g, color.b, 1.0)
	_rect.modulate.a = from_alpha
	_rect.show()

	_tween = create_tween()
	_tween.set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	_tween.tween_property(_rect, "modulate:a", to_alpha, maxf(duration, 0.0))

	if hide_when_done:
		_tween.finished.connect(_hide_rect)

	return _tween


func _hide_rect() -> void:
	if _rect != null:
		_rect.hide()
