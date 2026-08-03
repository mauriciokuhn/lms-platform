"use client";

import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface SubscriptionSummary {
  totalUsers: number;
  proUsers: number;
  enterpriseUsers: number;
  freeUsers: number;
  proPercentage: number;
  enterprisePercentage: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  revenueGrowth: number;
}

interface MonthlyGrowth {
  month: string;
  pro: number;
  enterprise: number;
  total: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  subscribers: number;
}

interface RecentSubscription {
  id: string;
  userName: string;
  userEmail: string;
  plan: string;
  status: string;
  createdAt: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionsData {
  summary: SubscriptionSummary;
  monthlyGrowth: MonthlyGrowth[];
  monthlyRevenue: MonthlyRevenue[];
  recentSubscriptions: RecentSubscription[];
}

export default function AdminSubscriptionsPage() {
  const [data, setData] = useState<SubscriptionsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/subscriptions");
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error("Error loading subscriptions:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 dark:border-zinc-600 border-t-zinc-900 dark:border-t-white" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-zinc-500 dark:text-zinc-400">
        Nenhum dado de assinatura disponível.
      </div>
    );
  }

  const { summary } = data;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Assinaturas</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Gerencie planos e assinantes
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Receita Mensal
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
            R$ {summary.monthlyRevenue.toFixed(2)}
          </p>
          <p className={`mt-0.5 text-xs ${summary.revenueGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
            {summary.revenueGrowth >= 0 ? "↑" : "↓"} {Math.abs(summary.revenueGrowth)}% no mês
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Assinantes PRO
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {summary.proUsers}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {summary.proPercentage}% dos usuários
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Assinantes Enterprise
          </p>
          <p className="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">
            {summary.enterpriseUsers}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {summary.enterprisePercentage}% dos usuários
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Total de Usuários
          </p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
            {summary.totalUsers}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {summary.freeUsers} gratuitos · {summary.activeSubscriptions} assinaturas ativas
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Plan Distribution */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
            Crescimento de Assinaturas
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.monthlyGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#a1a1aa" />
              <YAxis tick={{ fontSize: 11 }} stroke="#a1a1aa" />
              <Tooltip />
              <Bar dataKey="pro" fill="#f59e0b" radius={[2, 2, 0, 0]} name="Pro" stackId="a" />
              <Bar dataKey="enterprise" fill="#8b5cf6" radius={[2, 2, 0, 0]} name="Enterprise" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Chart */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
            Receita Projetada (R$)
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#a1a1aa" />
              <YAxis tick={{ fontSize: 11 }} stroke="#a1a1aa" />                <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, "Receita"]} />
              <Line type="monotone" dataKey="revenue" stroke="#18181b" strokeWidth={2} dot={{ r: 3 }} name="Receita" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Subscriptions Table */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Assinaturas Recentes
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                <th className="px-6 py-3 text-left font-medium text-zinc-500">Usuário</th>
                <th className="px-6 py-3 text-center font-medium text-zinc-500">Plano</th>
                <th className="px-6 py-3 text-center font-medium text-zinc-500">Status</th>
                <th className="px-6 py-3 text-center font-medium text-zinc-500">Início</th>
                <th className="px-6 py-3 text-center font-medium text-zinc-500">Expira</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {data.recentSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-400">
                    Nenhuma assinatura encontrada
                  </td>
                </tr>
              ) : (
                data.recentSubscriptions.map((sub) => (
                  <tr key={sub.id} className="bg-white transition hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800">
                    <td className="px-6 py-4">
                      <p className="font-medium text-zinc-900 dark:text-white">{sub.userName}</p>
                      <p className="text-xs text-zinc-400">{sub.userEmail}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        sub.plan === "PRO"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                          : "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300"
                      }`}>
                        {sub.plan === "PRO" ? "⭐ Pro" : "🏢 Enterprise"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        sub.status === "active"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : sub.status === "past_due"
                          ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                      }`}>
                        {sub.status === "active" ? "Ativo" : sub.status === "past_due" ? "Vencido" : "Cancelado"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-zinc-500 dark:text-zinc-400">
                      {new Date(sub.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-4 text-center text-zinc-500 dark:text-zinc-400">
                      {sub.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString("pt-BR")
                        : "—"}
                      {sub.cancelAtPeriodEnd && (
                        <span className="ml-1 text-[10px] text-red-500">(cancelando)</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
