"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Plus, 
  Trash2, 
  Save, 
  RotateCcw, 
  Download, 
  Upload, 
  Edit2, 
  CheckCircle2, 
  XCircle,
  FileSpreadsheet
} from "lucide-react";

import { LanguageText } from "@/components/language-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { FactoryConfig, DeviceProfile, ProcessType } from "@/lib/factory/types";
import { loadFactoryConfig, saveFactoryConfig, resetFactoryConfig } from "@/lib/factory/storage";

const PROCESS_TYPES: ProcessType[] = [
  "CNC_COILING",
  "GRINDING",
  "HEAT_TREAT",
  "SHOT_PEEN",
  "COATING",
  "ASSEMBLY",
  "INSPECTION",
  "PACKING",
];

export function FactoryConfigPanel() {
  const [config, setConfig] = useState<FactoryConfig | null>(null);
  const [isEditingDevice, setIsEditingDevice] = useState<DeviceProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);

  useEffect(() => {
    setConfig(loadFactoryConfig());
  }, []);

  const handleSave = () => {
    if (config) {
      saveFactoryConfig(config);
      alert("Configuration saved successfully!");
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset to default settings? All custom changes will be lost.")) {
      const defaultConfig = resetFactoryConfig();
      setConfig(defaultConfig);
    }
  };

  const handleAddDevice = () => {
    setIsEditingDevice({
      id: `NEW-${Date.now().toString().slice(-4)}`,
      label: "New Device",
      process: "CNC_COILING",
      ctSec: 5.0,
      setupMin: 30,
      fpy: 0.98,
      oeeTarget: 0.85,
      downRatePerHour: 0.02,
      enabled: true,
    });
    setIsDialogOpen(true);
  };

  const handleEditDevice = (device: DeviceProfile) => {
    setIsEditingDevice({ ...device });
    setIsDialogOpen(true);
  };

  const handleDeleteDevice = (id: string) => {
    if (confirm("Delete this device?")) {
      setConfig(prev => prev ? {
        ...prev,
        devices: prev.devices.filter(d => d.id !== id),
      } : null);
    }
  };

  const saveDeviceChanges = () => {
    if (isEditingDevice && config) {
      const exists = config.devices.find(d => d.id === isEditingDevice.id);
      setConfig({
        ...config,
        devices: exists 
          ? config.devices.map(d => d.id === isEditingDevice.id ? isEditingDevice : d)
          : [...config.devices, isEditingDevice]
      });
      setIsDialogOpen(false);
      setIsEditingDevice(null);
    }
  };

  const exportCSV = () => {
    if (!config) return;
    const headers = ["id", "label", "process", "ctSec", "setupMin", "fpy", "oeeTarget", "downRatePerHour", "enabled"];
    const rows = config.devices.map(d => [
      d.id,
      d.label,
      d.process,
      d.ctSec,
      d.setupMin,
      d.fpy,
      d.oeeTarget,
      d.downRatePerHour,
      d.enabled ? "true" : "false"
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `factory_devices_${config.factoryId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !config) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const [headerLine, ...lines] = text.split("\n").filter(l => l.trim());
      
      const newDevices: DeviceProfile[] = [];
      const errors: string[] = [];

      lines.forEach((line, index) => {
        const parts = line.split(",").map(p => p.trim());
        if (parts.length < 9) return;

        const [id, label, process, ctSec, setupMin, fpy, oeeTarget, downRatePerHour, enabled] = parts;
        
        // Validation
        const ct = parseFloat(ctSec);
        const fpyVal = parseFloat(fpy);
        const oee = parseFloat(oeeTarget);
        const down = parseFloat(downRatePerHour);

        if (isNaN(ct) || ct <= 0) errors.push(`Row ${index + 2}: Invalid cycle time`);
        if (isNaN(fpyVal) || fpyVal < 0.5 || fpyVal > 1) errors.push(`Row ${index + 2}: FPY must be between 0.5 and 1.0`);
        if (isNaN(oee) || oee < 0.1 || oee > 1) errors.push(`Row ${index + 2}: OEE Target must be between 0.1 and 1.0`);
        if (isNaN(down) || down < 0 || down > 1) errors.push(`Row ${index + 2}: Down rate must be between 0 and 1.0`);
        if (!PROCESS_TYPES.includes(process as ProcessType)) errors.push(`Row ${index + 2}: Invalid process type ${process}`);

        if (errors.length === 0) {
          newDevices.push({
            id,
            label,
            process: process as ProcessType,
            ctSec: ct,
            setupMin: parseFloat(setupMin),
            fpy: fpyVal,
            oeeTarget: oee,
            downRatePerHour: down,
            enabled: enabled.toLowerCase() === "true"
          });
        }
      });

      if (errors.length > 0) {
        setCsvError(errors.slice(0, 5).join("\n") + (errors.length > 5 ? "\n..." : ""));
      } else {
        setCsvError(null);
        // Merge by ID
        const mergedDevices = [...config.devices];
        newDevices.forEach(nd => {
          const idx = mergedDevices.findIndex(d => d.id === nd.id);
          if (idx !== -1) mergedDevices[idx] = nd;
          else mergedDevices.push(nd);
        });
        setConfig({ ...config, devices: mergedDevices });
        alert(`Successfully imported ${newDevices.length} devices.`);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  if (!config) return null;

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            <LanguageText en="Save Configuration" zh="保存配置" />
          </Button>
          <Button onClick={handleReset} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            <LanguageText en="Reset to Default" zh="重置为默认" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <input 
              type="file" 
              accept=".csv" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              onChange={importCSV}
            />
            <Button variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              <LanguageText en="Import CSV" zh="导入 CSV" />
            </Button>
          </div>
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" />
            <LanguageText en="Export CSV" zh="导出 CSV" />
          </Button>
        </div>
      </div>

      {csvError && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="pt-6 flex gap-3 text-rose-800 text-sm whitespace-pre-wrap">
            <XCircle className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold underline mb-1">CSV Import Errors:</p>
              {csvError}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle><LanguageText en="Machine Devices" zh="生产设备" /></CardTitle>
              <CardDescription>
                <LanguageText en="Manage your coiling, grinding, and assembly machines." zh="管理绕簧、磨削和组装设备。" />
              </CardDescription>
            </div>
            <Button onClick={handleAddDevice} size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              <LanguageText en="Add Device" zh="添加设备" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead><LanguageText en="Process" zh="工艺" /></TableHead>
                    <TableHead>CT (s)</TableHead>
                    <TableHead>FPY</TableHead>
                    <TableHead><LanguageText en="Status" zh="状态" /></TableHead>
                    <TableHead className="text-right"><LanguageText en="Actions" zh="操作" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.devices.map((device) => (
                    <TableRow key={device.id} className={!device.enabled ? "opacity-50" : ""}>
                      <TableCell className="font-medium">
                        <div>{device.label}</div>
                        <div className="text-xs text-muted-foreground">{device.id}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {device.process.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{device.ctSec}s</TableCell>
                      <TableCell>{(device.fpy * 100).toFixed(1)}%</TableCell>
                      <TableCell>
                        <Switch 
                          checked={device.enabled} 
                          onCheckedChange={(val) => setConfig({
                            ...config,
                            devices: config.devices.map(d => d.id === device.id ? { ...d, enabled: val } : d)
                          })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditDevice(device)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteDevice(device.id)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {config.devices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        <LanguageText en="No devices configured." zh="暂无配置设备。" />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle><LanguageText en="Work Shifts" zh="生产班次" /></CardTitle>
            <CardDescription>
              <LanguageText en="Define operating hours for simulation." zh="定义用于仿真的运营时间。" />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.shifts.map((shift, idx) => (
              <div key={shift.id} className="p-4 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{shift.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{shift.id}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Start</Label>
                    <Input 
                      type="time" 
                      value={shift.startHHMM} 
                      onChange={(e) => setConfig({
                        ...config,
                        shifts: config.shifts.map(s => s.id === shift.id ? { ...s, startHHMM: e.target.value } : s)
                      })}
                      className="h-8 py-1 px-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">End</Label>
                    <Input 
                      type="time" 
                      value={shift.endHHMM} 
                      onChange={(e) => setConfig({
                        ...config,
                        shifts: config.shifts.map(s => s.id === shift.id ? { ...s, endHHMM: e.target.value } : s)
                      })}
                      className="h-8 py-1 px-2 text-xs"
                    />
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => {
                    const active = shift.daysOfWeek.includes(i);
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          const newDays = active 
                            ? shift.daysOfWeek.filter(d => d !== i)
                            : [...shift.daysOfWeek, i];
                          setConfig({
                            ...config,
                            shifts: config.shifts.map(s => s.id === shift.id ? { ...s, daysOfWeek: newDays } : s)
                          });
                        }}
                        className={`w-6 h-6 rounded text-[10px] flex items-center justify-center border transition-colors ${
                          active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-muted-foreground/30 hover:border-primary/50"
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="pt-2">
              <p className="text-[10px] text-muted-foreground">
                <LanguageText 
                  en="* Timezone: " 
                  zh="* 当前时区: " 
                />
                {config.timezone}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {isEditingDevice?.id.startsWith("NEW-") 
                ? <LanguageText en="Add New Device" zh="添加新设备" />
                : <LanguageText en="Edit Device" zh="编辑设备" />
              }
            </DialogTitle>
            <DialogDescription>
              <LanguageText en="Configure performance parameters for this machine." zh="配置该机台的性能参数。" />
            </DialogDescription>
          </DialogHeader>
          
          {isEditingDevice && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="id" className="text-right">ID</Label>
                <Input id="id" value={isEditingDevice.id} onChange={(e) => setIsEditingDevice({ ...isEditingDevice, id: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="label" className="text-right"><LanguageText en="Label" zh="名称" /></Label>
                <Input id="label" value={isEditingDevice.label} onChange={(e) => setIsEditingDevice({ ...isEditingDevice, label: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="process" className="text-right"><LanguageText en="Process" zh="工艺" /></Label>
                <Select 
                  value={isEditingDevice.process} 
                  onValueChange={(val: ProcessType) => setIsEditingDevice({ ...isEditingDevice, process: val })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCESS_TYPES.map(pt => (
                      <SelectItem key={pt} value={pt}>{pt.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ct" className="text-right">CT (sec)</Label>
                <Input id="ct" type="number" step="0.1" value={isEditingDevice.ctSec} onChange={(e) => setIsEditingDevice({ ...isEditingDevice, ctSec: parseFloat(e.target.value) })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="fpy" className="text-right">FPY</Label>
                <Input id="fpy" type="number" step="0.001" min="0" max="1" value={isEditingDevice.fpy} onChange={(e) => setIsEditingDevice({ ...isEditingDevice, fpy: parseFloat(e.target.value) })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="oee" className="text-right">OEE Tgt</Label>
                <Input id="oee" type="number" step="0.01" min="0" max="1" value={isEditingDevice.oeeTarget} onChange={(e) => setIsEditingDevice({ ...isEditingDevice, oeeTarget: parseFloat(e.target.value) })} className="col-span-3" />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              <LanguageText en="Cancel" zh="取消" />
            </Button>
            <Button onClick={saveDeviceChanges}>
              <LanguageText en="Apply" zh="应用" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
