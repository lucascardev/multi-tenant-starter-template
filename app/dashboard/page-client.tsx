"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-label";
import { useUser } from "@stackframe/stack";
import { useRouter } from "next/navigation";

export function PageClient() {
  const router = useRouter();
  const user = useUser({ or: "redirect" });
  const teams = user.useTeams();

  const [empresaNome, setEmpresaNome] = React.useState('');

  React.useEffect(() => {
    if (teams.length > 0 && !user.selectedTeam) {
      user.setSelectedTeam(teams[0]);
    }
  }, [teams, user]);

  if (teams.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-center text-3xl font-semibold text-gray-800 mb-4">
          Bem-vindo!
        </h1>
        <p className="text-center text-gray-600 mb-6">
          Para avançar, você precisa criar uma empresa.
        </p>
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            user.createTeam({ displayName: empresaNome });
          }}
        >
          <div>
            <label htmlFor="empresaNome" className="block text-sm font-medium text-gray-700">
              Nome da Empresa
            </label>
            <input
              type="text"
              id="empresaNome"
              placeholder="Nome da Empresa"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={empresaNome}
              onChange={(e) => setEmpresaNome(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline"
          >
            Criar Empresa
          </button>
        </form>
      </div>
    </div>
    );
  } else if (user.selectedTeam) {
    router.push(`/dashboard/${user.selectedTeam.id}`);
  }

  return null;
}
