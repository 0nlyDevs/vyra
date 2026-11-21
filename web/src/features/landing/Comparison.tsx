// Ce qui nous distingue d'un chatbot, en trois lignes face à face.

const ROWS = [
  {
    chatbot: 'Donne une réponse.',
    mindstack: 'Montre l’histoire de l’information, version par version.',
  },
  {
    chatbot: 'Donne un avis convaincant.',
    mindstack: 'Fait plaider les deux camps, puis vous laisse juger.',
  },
  {
    chatbot: 'Répond toujours.',
    mindstack: 'Dit « informations insuffisantes » quand les preuves manquent.',
  },
];

export function Comparison() {
  return (
    <section aria-labelledby="comparison-title" className="border-y bg-card">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20">
        <h2 id="comparison-title" className="max-w-3xl font-semibold text-3xl md:text-4xl">
          Un chatbot répond toujours. MindStack répond avec des preuves.
        </h2>
        <div className="grid gap-px overflow-hidden rounded-2xl border bg-border">
          <div className="grid grid-cols-2 bg-muted font-medium text-sm">
            <span className="px-5 py-3 text-muted-foreground">Un chatbot</span>
            <span className="px-5 py-3 text-primary">MindStack</span>
          </div>
          {ROWS.map((row) => (
            <div key={row.chatbot} className="grid grid-cols-2 bg-background">
              <p className="px-5 py-4 text-muted-foreground">{row.chatbot}</p>
              <p className="px-5 py-4 font-medium">{row.mindstack}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
