import{j as e}from"./index-PYI9hPfO.js";import{I as p}from"./onboardingPresets-BMTi5f1h.js";import{a as m,c as b}from"./AppShell-UcCopozU.js";function f(){return e.jsx("style",{children:`
    [data-theme="dark"] {
      --b-canvas: #14100D;
      --b-surface: #1C1612;
      --b-elevated: #242017;
      --b-card: #1A1511;
      --b-ink: #F5EFE4;
      --b-ink-2: #D9CEBE;
      --b-ink-3: #9E9282;
      --b-ink-4: #6F6558;
      --b-border: #2E261E;
      --b-border-soft: #241D16;
      --b-border-heavy: #3C3226;
      --b-gold: #E4A647;
      --b-gold-light: #F0C679;
      --b-gold-pale: #2B2215;
      --b-gold-border: #463520;
      --b-forest: #6BA886;
      --b-forest-pale: #1A2620;
      --b-forest-border: #2C3F35;
      --b-terra: #E8836A;
      --b-terra-pale: #2B1E19;
    }
    [data-theme="dark"] body { background: var(--b-canvas); color: var(--b-ink); }
    [data-theme="dark"] .modal-backdrop { background: rgba(0,0,0,0.7); }
  `})}function y({onClose:a}){const{data:l=[]}=m(),{data:t}=b(),n=l.slice(0,6).map(i=>{var o,r,s;return{value:((o=i.value)==null?void 0:o.name)??"",message:i.message,sender:((r=i.sender)==null?void 0:r.display_name)??"",recipient:((s=i.recipient)==null?void 0:s.display_name)??""}}),d=()=>{window.print()},c=t!=null&&t.name?`${t.name} · this week`:"This week";return e.jsxs("div",{className:"modal-backdrop",onClick:a,style:{background:"rgba(28,20,16,0.85)"},children:[e.jsxs("div",{onClick:i=>i.stopPropagation(),style:{background:"var(--b-canvas)",borderRadius:"var(--r-lg)",width:"100%",maxWidth:900,maxHeight:"92vh",display:"flex",flexDirection:"column",overflow:"hidden"},children:[e.jsxs("div",{className:"row",style:{justifyContent:"space-between",padding:"14px 20px",borderBottom:"1px solid var(--b-border-soft)"},children:[e.jsxs("div",{children:[e.jsx("div",{className:"serif italic",style:{fontSize:"var(--t-xs)",color:"var(--b-gold)"},children:"For the break room"}),e.jsx("div",{className:"serif",style:{fontSize:"1.05rem",fontWeight:700,color:"var(--b-ink)"},children:"Kudos board — printable"})]}),e.jsxs("div",{className:"row",style:{gap:8},children:[e.jsx("button",{className:"btn btn-primary btn-sm",onClick:d,children:"Print / Save PDF"}),e.jsx("button",{className:"close",onClick:a,children:e.jsx(p,{name:"close"})})]})]}),e.jsx("div",{style:{overflow:"auto",flex:1,padding:24,background:"var(--b-ink)"},children:e.jsxs("div",{id:"print-sheet",style:{background:"#FAF6EF",padding:"48px 56px",borderRadius:6,boxShadow:"0 20px 60px rgba(0,0,0,0.3)",margin:"0 auto",maxWidth:820,aspectRatio:"11 / 8.5",display:"flex",flexDirection:"column"},children:[e.jsxs("div",{style:{textAlign:"center",marginBottom:28,paddingBottom:18,borderBottom:"2px solid #1F1815"},children:[e.jsx("div",{style:{fontFamily:"Fraunces",fontStyle:"italic",fontSize:16,color:"#C2882D",marginBottom:4},children:c}),e.jsx("div",{style:{fontFamily:"Fraunces",fontSize:42,fontWeight:700,letterSpacing:"-0.03em",color:"#1F1815",lineHeight:1,fontVariationSettings:'"opsz" 144'},children:"Kudos, team."})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:14,flex:1},children:[n.length===0&&e.jsx("div",{style:{gridColumn:"1 / -1",textAlign:"center",padding:40,color:"#6F6558",fontStyle:"italic"},children:"No recognitions to print yet."}),n.map((i,o)=>e.jsxs("div",{style:{background:"white",border:"1px solid #DED4C3",borderRadius:6,padding:"14px 16px",display:"flex",flexDirection:"column",gap:8},children:[e.jsx("div",{style:{fontFamily:"Fraunces",fontStyle:"italic",fontSize:11,color:"#C2882D"},children:i.value}),e.jsxs("div",{style:{fontFamily:"Fraunces",fontSize:13,color:"#1F1815",lineHeight:1.5,fontStyle:"italic",flex:1},children:['"',i.message.length>120?i.message.slice(0,120)+"…":i.message,'"']}),e.jsxs("div",{style:{display:"flex",justifyContent:"space-between",fontSize:10,color:"#6F6558",borderTop:"1px dashed #DED4C3",paddingTop:8},children:[e.jsxs("span",{children:[e.jsx("b",{style:{color:"#1F1815"},children:i.sender})," → ",i.recipient]}),e.jsx("span",{style:{fontFamily:"ui-monospace, monospace"},children:"★"})]})]},o))]}),e.jsx("div",{style:{textAlign:"center",marginTop:20,paddingTop:14,borderTop:"1px solid #DED4C3",fontSize:10,color:"#6F6558",fontStyle:"italic",fontFamily:"Fraunces"},children:"From the wall at bryte.ca · Print. Pin. Pass around."})]})})]}),e.jsx("style",{children:`
        @media print {
          body > *:not(.modal-backdrop) { display: none !important; }
          .modal-backdrop > div > div:first-child { display: none !important; }
          #print-sheet { box-shadow: none !important; margin: 0 !important; max-width: none !important; page-break-after: always; }
        }
      `})]})}export{f as DarkModeStyles,y as KudosPrintView};
//# sourceMappingURL=Extras2-CB9B8Mo4.js.map
