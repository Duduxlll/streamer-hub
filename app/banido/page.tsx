export default function BanidoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "radial-gradient(ellipse at center, #1a0505 0%, #040e09 70%)" }}>
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center text-4xl"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
          🚫
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Acesso bloqueado</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          Você foi banido desta plataforma e não pode acessar o site.
          Se acredita que isso é um engano, entre em contato com o streamer.
        </p>
      </div>
    </div>
  );
}
