import AppShell from "@/components/AppShell";
import PricingCards from "@/components/PricingCards";

export default function PricingPage() {
  return (
    <AppShell title="Pricing" description="Choose the plan that fits your study style.">
      <PricingCards />
    </AppShell>
  );
}
