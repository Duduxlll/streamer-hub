extends Node

var jogadores: Array = []
var top_n: int = 1
var carregado_do_site: bool = false

func _ready() -> void:
	carregar_dados_do_site()

	if jogadores.is_empty():
		jogadores = []
		top_n = 5


func carregar_dados_do_site() -> void:
	if not (OS.has_feature("web") or OS.get_name() == "Web" or OS.get_name() == "HTML5"):
		return

	var js := """
(function(){
	try {
		if (typeof window.CORRIDA_DADOS_JSON === 'string') return window.CORRIDA_DADOS_JSON;
		if (window.parent && typeof window.parent.CORRIDA_DADOS_JSON === 'string') return window.parent.CORRIDA_DADOS_JSON;
		return '{}';
	} catch(e) {
		return '{}';
	}
})()
"""

	var raw = JavaScriptBridge.eval(js, true)
	var dados = JSON.parse_string(str(raw))

	if typeof(dados) != TYPE_DICTIONARY:
		return

	var lista = dados.get("jogadores", [])
	var top = dados.get("topN", dados.get("top", 1))

	if typeof(lista) == TYPE_ARRAY:
		jogadores = []
		for item in lista:
			var nome := str(item).strip_edges()
			if nome != "":
				jogadores.append(nome)

		top_n = clampi(int(top), 1, 50)
		carregado_do_site = not jogadores.is_empty()


func enviar_resultado(vencedores: Array) -> void:
	if OS.has_feature("web") or OS.get_name() == "Web" or OS.get_name() == "HTML5":
		var json := JSON.stringify(vencedores)
		var js := """
(function(){
	try {
		if (typeof window.corridaResultado === 'function') {
			window.corridaResultado(%s);
			return;
		}
		if (window.parent && typeof window.parent.corridaResultado === 'function') {
			window.parent.corridaResultado(%s);
			return;
		}
	} catch(e) {}
})()
""" % [json, json]
		JavaScriptBridge.eval(js, true)
	else:
		print("Vencedores: ", vencedores)
