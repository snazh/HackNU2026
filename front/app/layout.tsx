// app/layout.tsx
export const metadata = {
  title: 'AI Brainstorm Canvas',
  description: 'Hackathon Project',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        {/* Здесь будут рендериться твои page.tsx и всё остальное */}
        {children}
      </body>
    </html>
  )
}