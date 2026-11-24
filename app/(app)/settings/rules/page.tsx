import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { getRuleConfig } from "@/lib/engine";
import { DEFAULT_RULE_CONFIG } from "@/lib/rules";
import { RulesEditor } from "./RulesEditor";

export const metadata: Metadata = { title: "Rules" };

export default async function RulesPage() {
  return (
    <>
      <PageHeader title="Detection rules" description="Enable rules and tune their thresholds for suspicious order monitoring." />
      <RulesEditor current={await getRuleConfig()} defaults={DEFAULT_RULE_CONFIG} />
    </>
  );
}
