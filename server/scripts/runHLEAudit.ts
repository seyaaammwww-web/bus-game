import { HLEEngine } from '../services/HLEEngine';

console.log("🚀 INITIATING HIERARCHICAL LEXICAL EXPANSION ENGINE (HLEE-v1.0)...");
console.log("----------------------------------------------------------------");

try {
    const engine = new HLEEngine();
    const report = engine.runFullAudit();

    console.log(`\n📊 BASELINE AUDIT COMPLETE`);
    console.log(`- Total Indexed Words: ${report.totalWords}`);
    console.log(`- Semantic Density Score: ${report.densityScore.toFixed(2)} words/cell`);

    console.log(`\n🚫 CRITICAL CONTAMINATION ALERTS (${report.contaminationIssues.length})`);
    if (report.contaminationIssues.length > 0) {
        // Show top 10 only
        report.contaminationIssues.slice(0, 10).forEach(i => console.log(`  ${i}`));
        if (report.contaminationIssues.length > 10) console.log(`  ...and ${report.contaminationIssues.length - 10} more.`);
    } else {
        console.log("  ✅ Zero Cross-Category Contamination Detected.");
    }

    console.log(`\n🕳️ GAP ANALYSIS (${report.gapReport.length} Weak Cells)`);
    if (report.gapReport.length > 0) {
        report.gapReport.slice(0, 10).forEach(g => console.log(`  ${g}`));
        if (report.gapReport.length > 10) console.log(`  ...and ${report.gapReport.length - 10} more.`);
    } else {
        console.log("  ✅ No Critical Gaps Found (High Density).");
    }

    console.log("\n----------------------------------------------------------------");
    console.log("✅ HLEE-v1.0 PROTOCOLS ACTIVE. DATABASE INTEGRITY: MONITORING");

} catch (e) {
    console.error("❌ HLEE FAILURE:", e);
}
