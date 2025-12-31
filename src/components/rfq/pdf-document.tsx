
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { EngineeringSummary, RFQManufacturingInputs, RFQContactInfo } from '@/lib/rfq/types';

// Register fonts if needed, or use standard fonts
// Font.register({ family: 'Roboto', src: '...' });

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10 },
  header: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#666' },
  section: { marginVertical: 10 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, backgroundColor: '#f0f0f0', padding: 4 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 120, fontWeight: 'bold', color: '#444' },
  value: { flex: 1 },
  warningBox: { backgroundColor: '#fff3cd', padding: 10, borderRadius: 4, marginTop: 10 },
  warningTitle: { fontSize: 11, fontWeight: 'bold', color: '#856404', marginBottom: 4 },
  listItem: { marginLeft: 10, marginBottom: 2 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10, fontSize: 8, color: '#999', textAlign: 'center' }
});

interface RFQDocumentProps {
    summary: EngineeringSummary;
    mfgInputs: RFQManufacturingInputs;
    contact: RFQContactInfo;
}

export const RFQDocument = ({ summary, mfgInputs, contact }: RFQDocumentProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Engineering RFQ Package</Text>
        <Text style={styles.subtitle}>ISRI-SHUANGDI Spring Engineering Platform</Text>
        <Text style={{ position: 'absolute', right: 0, top: 0, fontSize: 10 }}>{new Date().toLocaleDateString()}</Text>
      </View>

      {/* 1. Design Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Engineering Design Definition</Text>
        <View style={styles.row}><Text style={styles.label}>Spring Type:</Text><Text style={styles.value}>{summary.springType.toUpperCase()}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Design Hash:</Text><Text style={styles.value}>{summary.designHash}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Material:</Text><Text style={styles.value}>{summary.material}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Max Load:</Text><Text style={styles.value}>{summary.performance.maxLoad.toFixed(1)} N·m</Text></View>
         <View style={styles.row}><Text style={styles.label}>Stress Utilization:</Text><Text style={styles.value}>{summary.performance.utilization.toFixed(1)}%</Text></View>
      </View>

      {/* 2. Review Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Engineering Review Notes</Text>
        <View style={styles.row}><Text style={styles.label}>Review Status:</Text><Text style={styles.value}>{summary.reviewVerdict}</Text></View>
        
        {summary.reviewIssues.length > 0 ? (
             <View style={styles.warningBox}>
                <Text style={styles.warningTitle}>Identified Risks & Issues:</Text>
                {summary.reviewIssues.map((issue, i) => (
                    <Text key={i} style={styles.listItem}>• {issue}</Text>
                ))}
            </View>
        ) : (
            <Text style={{ color: 'green', marginTop: 5 }}>No significant engineering risks identified.</Text>
        )}
      </View>

      {/* 3. Manufacturing Inputs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Manufacturing Requirements</Text>
        <View style={styles.row}><Text style={styles.label}>Annual Volume (EAU):</Text><Text style={styles.value}>{mfgInputs.annualVolume}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Requested SOP:</Text><Text style={styles.value}>{mfgInputs.sopDate}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Prototypes:</Text><Text style={styles.value}>{mfgInputs.prototypeQty}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Region:</Text><Text style={styles.value}>{mfgInputs.productionRegion}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Surface Treatment:</Text><Text style={styles.value}>{mfgInputs.surfaceTreatment}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Quality Standard:</Text><Text style={styles.value}>{mfgInputs.qualityStandard}</Text></View>
      </View>
    
      {/* 4. Contact */}
      <View style={styles.section}>
         <Text style={styles.sectionTitle}>4. Contact Information</Text>
         <View style={styles.row}><Text style={styles.label}>Company:</Text><Text style={styles.value}>{contact.company}</Text></View>
         <View style={styles.row}><Text style={styles.label}>Person:</Text><Text style={styles.value}>{contact.contactPerson}</Text></View>
         <View style={styles.row}><Text style={styles.label}>Email:</Text><Text style={styles.value}>{contact.email}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Context:</Text><Text style={styles.value}>{contact.projectContext}</Text></View>
      </View>

      <Text style={styles.footer}>
        System Generated Document | Hash: {summary.designHash.substring(0, 16)}... | Valid for 30 days
      </Text>
    </Page>
  </Document>
);
