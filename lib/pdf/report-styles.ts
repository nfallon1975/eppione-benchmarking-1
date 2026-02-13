import { StyleSheet } from "@react-pdf/renderer";

// Eppione brand colors
export const BRAND = {
  navy: "#1B2A4A",
  cyan: "#00B4D8",
  cyanLight: "#48CAE4",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate300: "#cbd5e1",
  slate500: "#64748b",
  slate700: "#334155",
  slate900: "#0f172a",
  white: "#ffffff",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
};

export const styles = StyleSheet.create({
  // Page
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: BRAND.slate900,
  },
  pageFooter: {
    position: "absolute",
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 8,
    color: BRAND.slate500,
  },

  // Cover page
  coverPage: {
    fontFamily: "Helvetica",
    paddingHorizontal: 40,
    paddingVertical: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BRAND.navy,
  },
  coverLogo: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: BRAND.cyan,
    marginBottom: 8,
  },
  coverLogoSub: {
    fontSize: 11,
    color: BRAND.slate300,
    letterSpacing: 3,
    marginBottom: 60,
  },
  coverTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: BRAND.white,
    textAlign: "center",
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 14,
    color: BRAND.cyanLight,
    textAlign: "center",
    marginBottom: 8,
  },
  coverDivider: {
    width: 80,
    height: 2,
    backgroundColor: BRAND.cyan,
    marginVertical: 30,
  },
  coverMeta: {
    fontSize: 11,
    color: BRAND.slate300,
    textAlign: "center",
    marginBottom: 6,
  },
  coverConfidential: {
    position: "absolute",
    bottom: 40,
    fontSize: 9,
    color: BRAND.slate500,
    letterSpacing: 4,
  },

  // Section header
  sectionHeader: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: BRAND.navy,
    marginBottom: 4,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: BRAND.cyan,
  },
  sectionDescription: {
    fontSize: 9,
    color: BRAND.slate500,
    marginBottom: 16,
  },

  // Stat boxes
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: BRAND.slate100,
    borderRadius: 4,
    padding: 10,
  },
  statLabel: {
    fontSize: 8,
    color: BRAND.slate500,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: BRAND.navy,
  },
  statComparison: {
    fontSize: 8,
    color: BRAND.slate500,
    marginTop: 2,
  },

  // Tables
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND.navy,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: BRAND.white,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.slate200,
  },
  tableRowAlt: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.slate200,
    backgroundColor: BRAND.slate100,
  },
  tableCell: {
    fontSize: 9,
    color: BRAND.slate700,
  },

  // Chart image
  chartContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  chartImage: {
    maxWidth: "100%",
    maxHeight: 260,
    objectFit: "contain",
  },
  chartCaption: {
    fontSize: 8,
    color: BRAND.slate500,
    textAlign: "center",
    marginTop: 4,
  },

  // Findings / lists
  findingItem: {
    flexDirection: "row",
    marginBottom: 6,
    paddingLeft: 4,
  },
  findingNumber: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: BRAND.cyan,
    width: 20,
  },
  findingText: {
    fontSize: 10,
    color: BRAND.slate700,
    flex: 1,
    lineHeight: 1.4,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 8,
  },
  bulletDot: {
    fontSize: 10,
    color: BRAND.cyan,
    width: 12,
  },
  bulletText: {
    fontSize: 9,
    color: BRAND.slate700,
    flex: 1,
    lineHeight: 1.4,
  },

  // Methodology
  methodologyNote: {
    fontSize: 8,
    color: BRAND.slate500,
    lineHeight: 1.5,
    marginBottom: 8,
  },

  // Country section header
  countryHeader: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: BRAND.navy,
    marginBottom: 4,
    marginTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.slate200,
  },

  // Heatmap cell
  heatmapCell: {
    padding: 4,
    textAlign: "center",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
});
