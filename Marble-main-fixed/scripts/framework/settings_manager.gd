@tool

extends Node

signal value_changed(section, key)

const SETTINGS_FILE_NAME := "user://settings.cfg"

var default_values := [
	[&"marbles", &"marble_names", ""],
	[&"marbles", &"collision_enabled", true],
	[&"marbles", &"explosion_enabled", false],
]

var autosave := true

var _settings_file := ConfigFile.new()


func _ready():
	_settings_file.load(SETTINGS_FILE_NAME)

	for entry in default_values:
		var section = entry[0]
		var key = entry[1]
		var value = entry[2]
		add_user_signal("value_changed_{}_{}".format([section, key], "{}"))
		if _settings_file.get_value(section, key, null) == null:
			_settings_file.set_value(section, key, value)

	_settings_file.save(SETTINGS_FILE_NAME)


func get_value(section: StringName, key: StringName):
	var value = _settings_file.get_value(section, key)
	assert(value != null)
	return value


func set_value(section: StringName, key: StringName, value) -> void:
	var previous_value = _settings_file.get_value(section, key)
	if previous_value != value:
		_settings_file.set_value(section, key, value)
		if autosave:
			_settings_file.save(SETTINGS_FILE_NAME)
		emit_signal(&"value_changed", section, key)
		emit_signal("value_changed_{}_{}".format([section, key], "{}"))


func find_matching_loaded_locale() -> String:
	"""
	Returns a loaded locale that best matches currently set locale. If there
	are no translations provided, returns an empty string. Otherwise, attempts
	to match the exact locale name, if that fails, checks a partial match
	(e.g. "en_US" will match "en"). If the matching process fails for the
	current locale, fallback locale (from Project Settings) is checked.
	If that fails too, the first provided locale is returned.
	"""
	var current_locale = TranslationServer.get_locale()
	var loaded_locales = TranslationServer.get_loaded_locales()
	var fallback_locale = ProjectSettings.get(&"locale/fallback")

	if not loaded_locales:
		return ""

	if current_locale in loaded_locales:
		return current_locale

	for locale in [current_locale, fallback_locale]:
		for loaded_locale in loaded_locales:
			if locale.substr(0, 2) == loaded_locale.substr(0, 2):
				return loaded_locale

	return loaded_locales[0]
