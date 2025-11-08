import type { Metadata } from 'next';
import ThemeRegistry from '@/lib/registry';
import { AuthProvider } from '@/lib/AuthContext';

export const metadata: Metadata = {
  title: 'LitRevTool - Literature Review Tool',
  description: 'Overcome Google Scholar limitations with automated literature reviews',
  keywords: ['literature review', 'google scholar', 'academic research', 'systematic review'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}
