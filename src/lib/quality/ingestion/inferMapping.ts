import type { FieldMapping } from "../types";

export type MappingInference = {
  mapping: FieldMapping;
  confidence: Record<string, number>;
  suggestions: string[];
};

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function pick(headers: string[], patterns: Array<(h: string) => boolean>): string | undefined {
  for (const p of patterns) {
    const hit = headers.find((h) => p(norm(h)));
    if (hit) return hit;
  }
  return undefined;
}

function scoreForHeader(header: string | undefined, strong: boolean): number {
  if (!header) return 0;
  return strong ? 0.9 : 0.65;
}

export function inferMapping(headers: string[]): MappingInference {
  const suggestions: string[] = [];

  const value =
    pick(headers, [
      (h) => h === "value" || h === "measurement" || h === "meas" || h === "val" || h === "load",
      (h) => h.includes("value") || h.includes("meas") || h.includes("result") || h.includes("data") || h.includes("load"),
      (h) => h.includes("值") || h.includes("测量") || h.includes("尺寸") || h.includes("负载"),
    ]) ?? headers[0];

  const characteristic = pick(headers, [
    (h) => h === "characteristic" || h === "char" || h === "feature" || h === "ctq" || h === "item",
    (h) => h.includes("char") || h.includes("feature") || h.includes("ctq") || h.includes("项目"),
    (h) => h.includes("特性") || h.includes("尺寸项") || h.includes("检验项"),
  ]);

  const timestamp = pick(headers, [
    (h) => h === "timestamp" || h === "time" || h === "date" || h === "datetime",
    (h) => h.includes("time") || h.includes("date"),
    (h) => h.includes("时间") || h.includes("日期"),
  ]);

  const partId = pick(headers, [
    (h) => h === "partid" || h === "serial" || h === "sn" || h === "part",
    (h) => h.includes("serial") || h.includes("sn") || h.includes("part"),
    (h) => h.includes("序列") || h.includes("序号") || h.includes("件号"),
  ]);

  const lot = pick(headers, [
    (h) => h === "lot" || h === "batch" || h === "lotid",
    (h) => h.includes("lot") || h.includes("batch"),
    (h) => h.includes("批") || h.includes("lot"),
  ]);

  const machine = pick(headers, [
    (h) => h === "machine" || h === "equipment" || h === "station" || h === "line",
    (h) => h.includes("machine") || h.includes("equip") || h.includes("station") || h.includes("line"),
    (h) => h.includes("机台") || h.includes("设备") || h.includes("工位") || h.includes("产线"),
  ]);

  const shift = pick(headers, [
    (h) => h === "shift" || h === "team",
    (h) => h.includes("shift") || h.includes("team"),
    (h) => h.includes("班次") || h.includes("班组"),
  ]);

  const appraiser = pick(headers, [
    (h) => h === "appraiser" || h === "inspector" || h === "operator" || h === "person",
    (h) => h.includes("appraiser") || h.includes("inspector") || h.includes("operator"),
    (h) => h.includes("检验") || h.includes("检验员") || h.includes("操作") || h.includes("人员"),
  ]);

  const gage = pick(headers, [
    (h) => h === "gage" || h === "gauge" || h === "fixture" || h === "tool",
    (h) => h.includes("gage") || h.includes("gauge") || h.includes("fixture") || h.includes("tool"),
    (h) => h.includes("量具") || h.includes("夹具") || h.includes("工装"),
  ]);

  const trial = pick(headers, [
    (h) => h === "trial" || h === "repeat" || h === "rep" || h === "iteration",
    (h) => h.includes("trial") || h.includes("repeat") || h.includes("rep") || h.includes("iter"),
    (h) => h.includes("重复") || h.includes("次数") || h.includes("试次"),
  ]);

  const subgroupId = pick(headers, [
    (h) => h === "subgroup" || h === "subgroupid" || h === "group" || h === "groupid",
    (h) => h.includes("subgroup") || h.includes("groupid") || h.includes("group"),
    (h) => h.includes("子组") || h.includes("分组") || h.includes("组号"),
  ]);

  const unit = pick(headers, [
    (h) => h === "unit" || h === "units",
    (h) => h.includes("unit"),
    (h) => h.includes("单位"),
  ]);

  const lsl = pick(headers, [
    (h) => h === "lsl",
    (h) => h.includes("lsl") || h.includes("lower"),
    (h) => h.includes("下限") || h.includes("下公差"),
  ]);

  const usl = pick(headers, [
    (h) => h === "usl",
    (h) => h.includes("usl") || h.includes("upper"),
    (h) => h.includes("上限") || h.includes("上公差"),
  ]);

  const target = pick(headers, [
    (h) => h === "target" || h === "nominal",
    (h) => h.includes("target") || h.includes("nominal"),
    (h) => h.includes("目标") || h.includes("名义"),
  ]);

  const result = pick(headers, [
    (h) => h === "result" || h === "okng" || h === "passfail",
    (h) => h.includes("result") || h.includes("ok") || h.includes("pass") || h.includes("ng"),
    (h) => h.includes("判定") || h.includes("结论") || h.includes("合格"),
  ]);

  const tagCandidates = headers.filter((h) => {
    const k = norm(h);
    return (
      k.includes("machine") ||
      k.includes("shift") ||
      k.includes("inspector") ||
      k.includes("gage") ||
      k.includes("operator") ||
      k.includes("operation") ||
      k.includes("工位") ||
      k.includes("机台") ||
      k.includes("班次") ||
      k.includes("检验")
    );
  });

  if (!characteristic) {
    suggestions.push("No characteristic column inferred; all rows will be analyzed as one characteristic.");
  }

  if (!(lsl && usl)) {
    suggestions.push("No LSL/USL inferred; Cp/Cpk will be unavailable unless provided in mapping.");
  }

  const confidence: Record<string, number> = {
    value: scoreForHeader(value, true),
    characteristic: scoreForHeader(characteristic, !!characteristic),
    timestamp: scoreForHeader(timestamp, !!timestamp),
    partId: scoreForHeader(partId, !!partId),
    lot: scoreForHeader(lot, !!lot),
    machine: scoreForHeader(machine, !!machine),
    shift: scoreForHeader(shift, !!shift),
    appraiser: scoreForHeader(appraiser, !!appraiser),
    gage: scoreForHeader(gage, !!gage),
    trial: scoreForHeader(trial, !!trial),
    subgroupId: scoreForHeader(subgroupId, !!subgroupId),
    unit: scoreForHeader(unit, !!unit),
    lsl: scoreForHeader(lsl, !!lsl),
    usl: scoreForHeader(usl, !!usl),
    target: scoreForHeader(target, !!target),
    result: scoreForHeader(result, !!result),
  };

  const mapping: FieldMapping = {
    value,
    characteristic,
    timestamp,
    partId,
    lot,
    machine,
    shift,
    appraiser,
    gage,
    trial,
    subgroupId,
    unit,
    lsl,
    usl,
    target,
    result,
    tagColumns: tagCandidates.length ? tagCandidates : undefined,
  };

  return { mapping, confidence, suggestions };
}
