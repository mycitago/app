
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CitagoAccountingMetrics=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const num=v=>Number(v||0);
  const round2=v=>Math.round((num(v)+Number.EPSILON)*100)/100;
  const idOr=v=>v||'unassigned';
  function mapBy(list){return new Map((list||[]).map(x=>[String(x.id),x]))}
  function aggregateAccounting({appointments=[],staff=[],branches=[],services=[],expenses=[],month=null,branchId='',staffId=''}){
    const staffMap=mapBy(staff), branchMap=mapBy(branches), serviceMap=mapBy(services);
    const monthRows=(appointments||[]).filter(a=>!month||String(a.appointment_date||'').startsWith(month));
    const filtered=monthRows.filter(a=>(!branchId||String(a.branch_id||'unassigned')===String(branchId))&&(!staffId||String(a.staff_id||'unassigned')===String(staffId)));
    const completed=filtered.filter(a=>String(a.status||'').toLowerCase()==='completada');
    const confirmed=filtered.filter(a=>String(a.status||'').toLowerCase()==='confirmada');
    const expenseTotal=(expenses||[]).filter(e=>!month||String(e.expense_date||'').startsWith(month)).reduce((s,e)=>s+num(e.amount),0);

    const branchAgg=new Map(), staffAgg=new Map(), serviceAgg=new Map();
    let income=0, commissions=0;
    for(const a of completed){
      const amount=num(a.price_charged), bid=idOr(a.branch_id), sid=idOr(a.staff_id), vid=idOr(a.service_id);
      const st=staffMap.get(String(a.staff_id||'')); const rate=num(st?.commission_rate); const commission=round2(amount*rate/100);
      income+=amount; commissions+=commission;

      if(!branchAgg.has(bid))branchAgg.set(bid,{id:bid,name:branchMap.get(String(a.branch_id||''))?.name||'Sin asignar',appointments:0,income:0,commissions:0});
      const b=branchAgg.get(bid);b.appointments++;b.income+=amount;b.commissions+=commission;

      if(!staffAgg.has(sid))staffAgg.set(sid,{id:sid,name:st?.name||'Sin asignar',role:st?.role||'—',branch_id:st?.branch_id||a.branch_id||null,commissionRate:rate,appointments:0,income:0,commissions:0});
      const p=staffAgg.get(sid);p.appointments++;p.income+=amount;p.commissions+=commission;

      if(!serviceAgg.has(vid))serviceAgg.set(vid,{id:vid,name:serviceMap.get(String(a.service_id||''))?.name||'Servicio',appointments:0,income:0});
      const sv=serviceAgg.get(vid);sv.appointments++;sv.income+=amount;
    }
    const branchesOut=[...branchAgg.values()].map(x=>({...x,income:round2(x.income),commissions:round2(x.commissions),ticketAverage:x.appointments?round2(x.income/x.appointments):0,utility:round2(x.income-x.commissions)})).sort((a,b)=>b.income-a.income);
    const staffOut=[...staffAgg.values()].map(x=>({...x,income:round2(x.income),commissions:round2(x.commissions),ticketAverage:x.appointments?round2(x.income/x.appointments):0,utility:round2(x.income-x.commissions)})).sort((a,b)=>b.income-a.income);
    const servicesOut=[...serviceAgg.values()].map(x=>({...x,income:round2(x.income),ticketAverage:x.appointments?round2(x.income/x.appointments):0})).sort((a,b)=>b.income-a.income);
    return {
      summary:{
        income:round2(income), projected:round2(confirmed.reduce((s,a)=>s+num(a.price_charged),0)),
        completed:completed.length, ticketAverage:completed.length?round2(income/completed.length):0,
        commissions:round2(commissions), expenses:round2(expenseTotal), utility:round2(income-expenseTotal-commissions)
      },
      branches:branchesOut, staff:staffOut, services:servicesOut, completed
    };
  }
  return {aggregateAccounting,round2};
});
