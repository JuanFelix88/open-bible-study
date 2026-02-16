import InstallPage from "@/app/components/InstallPage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instalar Open Bible Study",
  description:
    "Instale o aplicativo Open Bible Study no seu dispositivo para a melhor experiência.",
};

export default function Page() {
  return (
    <InstallPage
      title="Open Bible Study"
      description="Instale o aplicativo para uma melhor experiência de leitura, acesso offline e muito mais."
      iosButtonText="Instalar no iOS"
      androidButtonText="Instalar no Android"
      installedText="Instalado"
      backButtonText="Voltar para a Página Inicial"
      iosInstructions={{
        step1: "Toque no botão Compartilhar no menu do navegador",
        step2: "Role para baixo e encontre 'Adicionar à Tela de Início'",
        step3: "Toque em 'Adicionar' no canto superior direito",
      }}
    />
  );
}
