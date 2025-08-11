(function(){
  const container = document.getElementById('cartContainer');
  function render(){
    const cart = JSON.parse(localStorage.getItem('cart')||'[]');
    if(!cart.length){ container.innerHTML = '<p>السلة فارغة.</p>'; return; }
    let total = 0;
    const rows = cart.map((item, idx)=>{
      const sub = item.price * item.qty; total += sub;
      return `<tr>
        <td><img src="${item.image||''}" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:8px" /></td>
        <td>${item.name}</td>
        <td>${Number(item.price).toFixed(2)} ر.س</td>
        <td>
          <button data-i="${idx}" data-op="-">-</button>
          <span style="display:inline-block;min-width:24px;text-align:center">${item.qty}</span>
          <button data-i="${idx}" data-op="+">+</button>
          ${typeof item.stock==='number' ? `<div style="font-size:12px;color:#6b3b52">المتوفر: ${item.stock}</div>` : ''}
        </td>
        <td>${sub.toFixed(2)} ر.س</td>
        <td><button data-i="${idx}" data-op="x">حذف</button></td>
      </tr>`;
    }).join('');
    container.innerHTML = `<table class="table">
      <thead><tr><th>صورة</th><th>المنتج</th><th>السعر</th><th>الكمية</th><th>الإجمالي</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="4" style="text-align:left">الإجمالي</td><td colspan="2">${total.toFixed(2)} ر.س</td></tr></tfoot>
    </table>`;
    container.querySelectorAll('button').forEach(b=>{
      const i = Number(b.dataset.i); const op = b.dataset.op;
      b.onclick = ()=>{
        const cart = JSON.parse(localStorage.getItem('cart')||'[]');
        if(op==='-'){ cart[i].qty = Math.max(1, cart[i].qty-1); }
        else if(op==='+'){
          const max = typeof cart[i].stock==='number' ? cart[i].stock : null;
          if(max !== null && cart[i].qty >= max){
            alert('لا يمكن زيادة الكمية عن المتوفر في المخزون');
            return;
          }
          cart[i].qty += 1;
        }
        else if(op==='x'){ cart.splice(i,1); }
        localStorage.setItem('cart', JSON.stringify(cart));
        render();
      };
    })
  }
  document.getElementById('clearCart')?.addEventListener('click',()=>{ localStorage.removeItem('cart'); render(); });
  document.getElementById('checkout')?.addEventListener('click',()=>{
    alert('هذه نسخة تجريبية. يمكن ربطها لاحقًا بإنشاء طلب في Supabase.');
  });
  render();
})();
