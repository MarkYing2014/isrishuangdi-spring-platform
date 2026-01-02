import { FactoryConfigPanel } from "@/components/factory/FactoryConfigPanel";
import { LanguageText } from "@/components/language-context";

export default function FactoryConfigPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          <LanguageText en="Factory Configuration" zh="工厂配置" />
        </h1>
        <p className="text-muted-foreground">
          <LanguageText 
            en="Configure your shopfloor devices, shift schedules, and manufacturing processes. These settings drive the production monitoring and simulation modes." 
            zh="配置车间设备、班次计划和生产工艺。这些设置将驱动生产监控和仿真模式。" 
          />
        </p>
      </div>
      
      <FactoryConfigPanel />
    </div>
  );
}
