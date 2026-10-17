import { ImageResponse } from "next/og";
export const alt = "GuroVia school gradebook platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "76px", background: "#f5f7f2", color: "#173b2e" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
        <div style={{ width: "76px", height: "76px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "20px", background: "#245c46" }}><div style={{ width: "44px", height: "33px", display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "3px" }}><div style={{ width: "19px", height: "27px", display: "flex", flexDirection: "column", justifyContent: "space-evenly", padding: "3px 3px 0", border: "2px solid #ffffff", borderBottom: "0", borderRadius: "4px 4px 0 0" }}><div style={{ height: "2px", background: "#cbe4d2", borderRadius: "2px" }} /><div style={{ height: "2px", width: "70%", background: "#cbe4d2", borderRadius: "2px" }} /></div><div style={{ width: "19px", height: "27px", display: "flex", flexDirection: "column", justifyContent: "space-evenly", padding: "3px 3px 0", border: "2px solid #ffffff", borderBottom: "0", borderRadius: "4px 4px 0 0" }}><div style={{ height: "2px", background: "#cbe4d2", borderRadius: "2px" }} /><div style={{ height: "2px", width: "70%", background: "#cbe4d2", borderRadius: "2px" }} /></div></div></div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: "42px", fontWeight: 700 }}>GuroVia</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", maxWidth: "900px", gap: "14px" }}>
        <div style={{ display: "flex", fontSize: "66px", lineHeight: 1.03, letterSpacing: "-2px", fontWeight: 700 }}>Better grade records.</div>
        <div style={{ display: "flex", fontSize: "66px", lineHeight: 1.03, letterSpacing: "-2px", color: "#507961" }}>A clearer school day.</div>
        <div style={{ display: "flex", fontSize: "27px", color: "#63746a", marginTop: "10px" }}>A clear, secure gradebook for every school.</div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "20px", color: "#6d7e73" }}><span>Schools · Teachers · Students · Families</span><span>GUROVIA.COM</span></div>
    </div>, size
  );
}
