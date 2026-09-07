(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root) root.DashboardPunctuality=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const STATES={
    upcoming:{key:'upcoming',label:'Próxima',icon:'calendar-clock',className:'punctuality-upcoming'},
    starting:{key:'starting',label:'Por comenzar',icon:'hourglass',className:'punctuality-starting'},
    in_progress:{key:'in_progress',label:'En curso',icon:'circle-play',className:'punctuality-in-progress'},
    late:{key:'late',label:'Atrasada',icon:'triangle-alert',className:'punctuality-late'},
    completed:{key:'completed',label:'Completada',icon:'circle-check',className:'punctuality-completed'},
    cancelled:{key:'cancelled',label:'Cancelada',icon:'circle-x',className:'punctuality-completed'},
    other_branch:{key:'other_branch',label:'Otra sucursal',icon:'map-pin',className:'punctuality-other-branch'}
  };

  function timeToMinutes(value){
    const [h,m]=String(value||'00:00').slice(0,5).split(':').map(Number);
    return (Number.isFinite(h)?h:0)*60+(Number.isFinite(m)?m:0);
  }

  function businessNowParts(date,timeZone){
    if(!timeZone) return null;
    const fmt=new Intl.DateTimeFormat('en-CA',{
      timeZone,
      year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',hourCycle:'h23'
    });
    const parts=Object.fromEntries(fmt.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
    return {
      dateKey:`${parts.year}-${parts.month}-${parts.day}`,
      minutes:Number(parts.hour)*60+Number(parts.minute)
    };
  }

  function formatBusinessTime(date,timeZone,use12Hour=false){
    if(!timeZone) return '';
    return new Intl.DateTimeFormat('es-MX',{
      timeZone,
      hour:'numeric',
      minute:'2-digit',
      hour12:Boolean(use12Hour)
    }).format(date);
  }

  function formatBusinessDate(date,timeZone){
    if(!timeZone) return '';
    return new Intl.DateTimeFormat('es-MX',{
      timeZone,
      weekday:'long',
      day:'numeric',
      month:'long',
      year:'numeric'
    }).format(date);
  }

  function getPunctualityState(appointment,nowParts,context={}){
    const status=String(appointment?.status||'').toLowerCase();
    if(['completada','completed'].includes(status)) return STATES.completed;
    if(['cancelada','cancelled','no_asistio','no-show','no_show'].includes(status)) return STATES.cancelled;

    if(context.primaryBranchId && appointment?.branch_id && appointment.branch_id!==context.primaryBranchId){
      return STATES.other_branch;
    }

    if(!nowParts) return null;
    const dateKey=String(appointment?.appointment_date||'');
    if(dateKey>nowParts.dateKey) return STATES.upcoming;
    if(dateKey<nowParts.dateKey) return STATES.late;

    const start=timeToMinutes(appointment?.start_time);
    const end=timeToMinutes(appointment?.end_time);

    if(['en_curso','in_progress'].includes(status)) return STATES.in_progress;
    if(nowParts.minutes<start-15) return STATES.upcoming;
    if(nowParts.minutes<start) return STATES.starting;
    if(nowParts.minutes<=end) return STATES.in_progress;
    return STATES.late;
  }

  function summarizeTodayPunctuality(states){
    const relevant=(states||[]).filter(Boolean);
    const active=relevant.filter(s=>['upcoming','starting','in_progress'].includes(s.key)).length;
    const late=relevant.filter(s=>s.key==='late').length;
    const chunks=[];
    if(active) chunks.push(`${active} en curso o próxima${active===1?'':'s'}`);
    if(late) chunks.push(`${late} atrasada${late===1?'':'s'}`);
    return chunks.join(' · ');
  }

  return {
    STATES,timeToMinutes,businessNowParts,formatBusinessTime,formatBusinessDate,
    getPunctualityState,summarizeTodayPunctuality
  };
});
