(function(){
  if(window.__fantasminLoaded)return;window.__fantasminLoaded=true;
  const style=document.createElement('style');style.textContent=`
  #fantasmin-toggle{position:fixed;right:20px;bottom:22px;z-index:1100;border:0;border-radius:999px;background:#7437e8;color:white;padding:13px 18px;font:700 14px Manrope,Arial;box-shadow:0 9px 28px #39205a44;cursor:pointer}
  #fantasmin-panel{position:fixed;right:20px;bottom:80px;width:min(380px,calc(100vw - 32px));max-height:min(590px,75vh);z-index:1101;display:flex;flex-direction:column;background:white;color:#241b34;border:1px solid #e9e3f2;border-radius:18px;box-shadow:0 20px 60px #25163940;overflow:hidden;font:14px Manrope,Arial}
  #fantasmin-panel[hidden]{display:none}#fantasmin-head{padding:16px;background:#f6f1ff;display:flex;align-items:center;justify-content:space-between}#fantasmin-head button{background:transparent;border:0;font-size:22px;cursor:pointer}
  #fantasmin-log{padding:16px;overflow:auto;display:grid;gap:10px;min-height:130px}#fantasmin-log p{margin:0;padding:10px 12px;background:#f5f3f9;border-radius:12px;line-height:1.5;white-space:pre-wrap}#fantasmin-log p.mine{background:#eee5ff}
  #fantasmin-form{display:flex;gap:7px;padding:12px;border-top:1px solid #eee}#fantasmin-question{flex:1;min-width:0;padding:10px;border:1px solid #d9d0e5;border-radius:10px}#fantasmin-send{background:#7437e8;color:#fff;border:0;border-radius:10px;padding:0 12px;cursor:pointer}
  @media(max-width:600px){#fantasmin-toggle{bottom:80px;right:12px}#fantasmin-panel{bottom:137px;right:12px}}
  `;document.head.appendChild(style);
  const toggle=document.createElement('button');toggle.id='fantasmin-toggle';toggle.type='button';toggle.textContent='👻 Fantasmin';toggle.setAttribute('aria-expanded','false');
  const panel=document.createElement('section');panel.id='fantasmin-panel';panel.hidden=true;panel.setAttribute('aria-label','Asistente Fantasmin');
  panel.innerHTML='<div id="fantasmin-head"><div><strong>👻 Fantasmin</strong><div style="font-size:12px">Asistente de tu negocio</div></div><button type="button" id="fantasmin-close" aria-label="Cerrar">×</button></div><div id="fantasmin-log" role="log" aria-live="polite"></div><form id="fantasmin-form"><input id="fantasmin-question" aria-label="Pregunta a Fantasmin" placeholder="¿Qué citas tengo pendientes?" required maxlength="200"><button id="fantasmin-send" type="submit">Enviar</button></form>';
  document.body.append(toggle,panel);
  const log=panel.querySelector('#fantasmin-log'),input=panel.querySelector('#fantasmin-question');
  function say(message,mine=false){const p=document.createElement('p');p.textContent=message;if(mine)p.className='mine';log.appendChild(p);log.scrollTop=log.scrollHeight;}
  function show(open){panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));if(open)input.focus();}
  toggle.onclick=()=>show(panel.hidden);panel.querySelector('#fantasmin-close').onclick=()=>show(false);
  say('¡Hola! Soy Fantasmin. Pregúntame por tus citas de hoy, próximas citas o pendientes de confirmar.');
  let busy=false;
  panel.querySelector('#fantasmin-form').onsubmit=async event=>{
    event.preventDefault();if(busy)return;const question=input.value.trim();if(!question)return;say(question,true);input.value='';busy=true;
    const button=panel.querySelector('#fantasmin-send');button.disabled=true;
    try{
      if(typeof requireAuth!=='function'||typeof getMyBusiness!=='function'||!window.supabaseClient)throw new Error('Abre tu sesión para consultar los datos.');
      const session=await requireAuth();if(!session)throw new Error('Tu sesión no está activa.');
      const business=await getMyBusiness(session.user);if(!business?.id)throw new Error('No encontramos tu negocio.');
      const today=new Date();const date=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
      const q=question.toLocaleLowerCase('es-MX');let query=window.supabaseClient.from('appointments').select('appointment_date,start_time,status,customers(name),services(name)').eq('business_id',business.id);
      let heading='';
      if(/pendient|confirmar|sin confirmar/.test(q)){heading='Citas pendientes de confirmar';query=query.in('status',['pendiente','pending']).gte('appointment_date',date).order('appointment_date').order('start_time').limit(15);}
      else if(/hoy|día/.test(q)){heading='Citas de hoy';query=query.eq('appointment_date',date).order('start_time').limit(20);}
      else if(/pr[oó]xim|mañana|citas|agenda/.test(q)){heading='Próximas citas';query=query.gte('appointment_date',date).in('status',['pendiente','pending','confirmada']).order('appointment_date').order('start_time').limit(15);}
      else{say('Por ahora puedo consultar citas de hoy, próximas citas y pendientes de confirmar. Para pagos, ingresos y otras preguntas todavía estamos preparando la conexión.');return;}
      const {data,error}=await query;if(error)throw error;
      if(!data?.length){say(heading+': no encontré registros para esta consulta.');return;}
      say(heading+' ('+data.length+(data.length===15?' o más':'')+'):\n'+data.map(a=>a.appointment_date+' '+String(a.start_time||'').slice(0,5)+' · '+(a.customers?.name||'Cliente')+' · '+(a.services?.name||'Servicio')+' · '+(a.status||'Sin estado')).join('\n')+'\nConsulta la Agenda para gestionar las citas.');
    }catch(error){say('No pude consultar los datos. '+(error?.message||'Inténtalo de nuevo.'));}
    finally{busy=false;button.disabled=false;}
  };
})();