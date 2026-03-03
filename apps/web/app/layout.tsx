export const metadata = {
  title: "UberSkillz",
  description: "Design, test, and deploy Claude Code Agent Skills",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
