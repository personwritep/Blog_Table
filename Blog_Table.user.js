// ==UserScript==
// @name        Blog Table ⭐
// @namespace        http://tampermonkey.net/
// @version        5.6
// @description        編集画面上にtable表を作成する
// @author        Ameba Blog User
// @match        https://blog.ameba.jp/ucs/entry/srventry*
// @exclude        https://blog.ameba.jp/ucs/entry/srventrylist.do*
// @icon        https://www.google.com/s2/favicons?sz=64&domain=ameblo.jp
// @grant        none
// @updateURL        https://github.com/personwritep/Blog_Table/raw/main/Blog_Table.user.js
// @downloadURL        https://github.com/personwritep/Blog_Table/raw/main/Blog_Table.user.js
// ==/UserScript==



let retry=0;
let interval=setInterval(wait_target, 100);
function wait_target(){
    retry++;
    if(retry>10){ // リトライ制限 10回 1sec
        clearInterval(interval); }
    let target=document.getElementById('cke_1_contents'); // 監視 target
    if(target){
        clearInterval(interval);
        main(); }}



function main(){
    let ua=0; // Chromeの場合のフラグ
    let agent=window.navigator.userAgent.toLowerCase();
    if(agent.indexOf('firefox') > -1){ ua=1; } // Firefoxの場合のフラグ

    let task=0; // 起動1・作成2・更新3・終了0
    let trim=0; // 追加0・削除1
    let cell_set=0; // セル幅設定パネルの列選択
    let j_dir=0; // セル結合方向　行方向0・列方向1

    let posit_set; // 中央寄せ・左寄せ
    let table_position;
    let border_collapse;
    let add_padd; // td のpadding値
    let layout_fix; // table-layout設定
    let table_border_color;
    let cell_border_width;
    let border_space;
    let left_full; // 左端背景色の優先
    let color_input=[]; // 4個のカラー設定枠
    let setting=[];
    let word_break; // 英文禁則


    if(read_locals()){
        setting=read_locals(); }
    if(setting.length!=18){
        setting=['BlogTable','3','3','0','580','620','0.6','1',' tr:not(:first-child)',
                 '#999','#F4F4F4','#F4F4F4','#FFF','16','auto','break-all','','']; }
    write_locals(setting);


    function read_locals(){
        let read_json=localStorage.getItem('BlogTable'); // ストレージ 保存名
        return JSON.parse(read_json); }

    function write_locals(data){
        let write_json=JSON.stringify(data);
        localStorage.setItem('BlogTable', write_json); } // ストレージ 保存



    let target=document.getElementById('cke_1_contents'); // 監視 target
    let monitor=new MutationObserver( catch_key );
    monitor.observe(target, {childList: true, attributes: true}); // ショートカット待受け開始

    catch_key();

    function catch_key(){
        if(document.querySelector('.cke_wysiwyg_frame') !=null){ //「通常表示」から実行開始
            let editor_iframe=document.querySelector('.cke_wysiwyg_frame');
            let iframe_doc=editor_iframe.contentWindow.document;

            iframe_doc.addEventListener('keydown', check_key);
            document.addEventListener('keydown', check_key);

            function check_key(event){
                if(event.keyCode==13 && iframe_doc.hasFocus()){
                    remove_mark(); } // 改行入力が連続マークとなるのを抑止

                let gate=-1;
                if(event.ctrlKey==true){
                    if(event.keyCode==112){
                        event.preventDefault(); gate=1; }
                    if(gate==1){
                        event.stopImmediatePropagation();
                        do_task(); }}}

            function do_task(){
                if(task==0){
                    task=1;
                    table_panel();
                    enhanced(); }
                else{
                    task=0;
                    remove_t_panel();
                    remove_mark_all(); }}}

        before_end();

    } // catch_key()



    function table_panel(){

        let panel=
            '<div id="t_panel">'+
            '<span class="t_label">構成</span>'+
            '<div class="wnc"><input id="col" type="number" min="1"></div>'+
            '<div class="wnr"><input id="row" type="number" min="1"></div>'+
            '<span class="t_label">配置</span>'+
            '<input id="wide" type="submit" value="　">'+
            '<span class="t_label">表幅</span>'+
            '<div class="wpxt"><input id="t_width" type="number" min="10" max="1200"></div>'+
            '<input id="t_width_m" type="submit" value="м">'+
            '<input id="td_padd" type="submit" value="　">'+
            '<input id="equal" type="submit" value="　">'+
            '<span class="t_label">枠線</span>'+
            '<div class="wpx"><input id="border_width" type="number" min="-9"></div>'+
            '<input id="border_color" type="text" autocomplete="off">'+
            '<span class="t_label">最上行背景</span>'+
            '<input id="header_back" type="text" autocomplete="off">'+
            '<span class="t_label">左端列背景</span>'+
            '<input id="left_back" type="text" autocomplete="off">'+
            '<input id="left_back_f" type="submit" value="▲">'+
            '<span class="t_label">全体背景</span>'+
            '<input id="cell_back" type="text" autocomplete="off">'+
            '<span class="t_label">文字</span>'+
            '<div class="wpx"><input id="t_font" type="number" min="12" max="32"></div>'+
            '<input id="copy" type="submit" value="C">'+
            '<input id="set" type="submit" value="　">'+
            '<span id="test"></span>'+

            '<div id="first">'+
            '<span id="bt_help">？</span>'+
            '<div class="bt_help1">'+
            '表を作成する場所 / 更新する表を<b>「Ctrl+左Click」</b>で指定してください</div>'+
            '<div class="bt_help2">'+
            'TRIM処理：左端列・最上行を<b>「Alt+左Click」</b>して 削除する列・行'+
            '（追加の場合は後方の列・行）を指定してください</div>'+
            '<div class="bt_help3">'+
            '<input class="trim_close" type="submit" value="✖">'+
            'TRIM操作の選択'+
            '<input id="trim_add" type="submit" value="追加">'+
            '<input id="trim_rem" type="submit" value="削除">　➡　'+
            '<input id="trim_do" type="submit" value="実行">'+
            '<input id="trim_cancel" type="submit" value="中止">'+
            '赤ラインの位置にTRIM処理を実行します</div>'+

            '<div class="bc_help4">'+
            '<input id="col_close" type="submit" value="✖">'+
            '表幅'+
            '<div class="wpx wpxw lock">'+
            '<input id="table_width" type="number"></div>'+
            '列幅指定'+
            '<div class="wpx wpxw">'+
            '<input id="col_width" type="number" min="0" max="1200"></div>'+
            '列選択'+
            '<input id="col_l" type="submit" value="⇦">'+
            '<input id="col_r" type="submit" value="⇨">'+
            '<span class="w_reset">等幅</span>'+
            '<input id="specified1" type="button" value="　">'+
            '<span class="w_reset">Auto幅</span>'+
            '<input id="specified2" type="button" value="　">'+
            '<span class="w_reset">英文禁則</span>'+
            '<input id="word_b" type="button" value="No">'+
            '<span class="w_reset">初期化</span>'+
            '<input id="to_auto" type="button" value="Auto">'+
            '</div>'+

            '<div class="bt_help5">'+
            '<input class="join_close" type="submit" value="✖">'+
            '結合開始セルの指定：<b>「Ctrl+Alt+左Click」</b>　　'+
            '結合方向：<input id="join_dir" type="submit" value="▶"> '+
            '範囲：<input id="join_area" type="number" value="1" min="1">'+
            '　➡　'+
            '<input id="join_do" type="submit" value="実行">'+
            '</div>'+

            '<div class="bt_help6">'+
            '結合開始セルの指定：<b>「Ctrl+Alt+左Click」</b>　　'+
            '開始セルを基準に 右方向 または 下方向 のセルを結合します。'+
            '</div>'+
            '</div>'+

            '<style>'+
            '#t_panel { position: fixed; top: 15px; left: calc(50% - 490px); width: 954px; '+
            'font-size: 14px; padding: 6px 12px; overflow: hidden; '+
            'border: 1px solid #ccc; border-radius: 4px; background: #eff5f6; z-index: 10; }'+
            '#t_panel * { user-select: none; }'+
            '#t_panel input { position: relative; margin-right: 10px; padding-top: 2px; '+
            'height: 27px; box-sizing: border-box; border: thin solid #aaa; }'+
            '#t_panel input[type="number"] { padding-right: 2px; margin-right: 0; }'+
            '#t_panel input[type="number"]:focus, #t_panel input[type="submit"]:focus '+
            '{ box-shadow: none; }'+
            '.t_label { margin: 0 3px 0 0; }'+

            '#col, #row { width: 40px; text-align: center; }'+
            '#wide { width: 30px; letter-spacing: -0.5em; text-indent: -6px; }'+
            '#t_width { width: 54px; text-align: center; }'+
            '#t_width_m { margin-left: -9px; width: 14px; }'+
            '#td_padd { width: 30px; margin-left: 2px; }'+
            '#equal { width: 34px; }'+
            '#border_width { width: 40px; text-align: center; }'+
            '#left_back_f { margin-left: -9px; width: 14px; text-indent: -1px; }'+
            '#t_font { width: 40px; text-align: center; }'+
            '#wide, #t_width_m, #td_padd, #equal, #left_back_f { background: #fff; }'+

            '.wnc, .wnr, .wpx, .wpxt { position: relative; display: inline-block; }'+
            '.wnc { margin-right: 2px; }'+
            '.wnr, .wpx, .wpxt { margin-right: 10px; }'+
            '.wnc::after { content: "列"; }'+
            '.wnr::after { content: "行"; }'+
            '.wpx::after, .wpxt::after { content: "px"; }'+
            '.wnc::after, .wnr::after, .wpx::after, .wpxt::after { position: absolute; right: 2px; '+
            'top: 2px; padding: 3px 0 0; width: 17px; background: #fff; }'+
            '.wpx:hover::after, .wpxt:hover::after, .wnc:hover::after, .wnr:hover::after '+
            '{ content: ""; }'+
            '.wpxt.lock { pointer-events: none; background: #80deea; }'+
            '.wpxt.lock::after { background: inherit; }'+
            '.wpxt.lock #t_width { background: inherit; }'+
            '#t_width_m.lock { pointer-events: none; background: #80deea !important; }'+

            '#border_color { margin-left: -9px; }'+
            '#border_color, #header_back, #left_back, #cell_back { '+
            'width: 0; padding: 2px 16px 0 0; cursor: pointer; }'+
            '#border_color:focus, #header_back:focus, #left_back:focus, #cell_back:focus { '+
            'width: 99px; margin-right: -71px; padding: 2px 0 0 22px; z-index: 1; cursor: text; }'+

            '#copy { margin: 0 !important; padding: 2px 4px 0; font-weight: bold; '+
            'color: #fff; background: #1976d2; visibility: hidden; }'+
            '#set { margin: 0 !important; padding: 2px 4px 0; float: right; }'+
            '#set:hover, #copy:hover { background: #fff; color: #000; }'+
            '#set { background: #1976d2; color: #fff; }'+

            '#first { position: absolute; top: 0; left: 0; color: #fff; background: #2196f3; '+
            'width: 100%; padding: 10px 0; font-size: 16px; text-align: center; }'+
            '#bt_help { position: absolute; top: 11px; right: 25px; padding: 2px 1px 0; '+
            'line-height: 16px; font-weight: bold; border-radius: 30px; '+
            'color: #2196f3; background: #fff; cursor: pointer; }'+
            '.bt_help1 { text-align: left; margin-left: 60px; }'+
            '.bt_help2, .bt_help6 { text-align: left; margin-left: 50px; }'+
            '.bt_help3, .bt_help5 { text-align: left; margin: -3px 20px; }'+
            '.bt_help3 input, .bt_help5 input { font: normal 15px/15px Meiryo; '+
            'height: 26px !important; padding: 2px 6px 0; color: #333; '+
            'text-shadow: 0.5px 0 0.6px #666; border: none !important; border-radius: 3px; }'+
            '.trim_close , .join_close { margin-right: 30px !important; }'+
            '#trim_add { margin-left: 15px; }'+
            '#trim_cancel { margin-right: 30px !important; }'+
            '#join_dir { font-size: 17px; vertical-align: -1px; }'+
            '#join_area { width: 48px; text-align: center; }'+
            '#join_area::-webkit-inner-spin-button { height: 20px; margin-top: 1px; }'+

            '.bc_help4 { text-align: left; margin: -4px 20px; }'+
            '.bc_help4 input { color: #000; background: #fff; border-radius: 3px; }'+
            '.bc_help4 input[type=number]::-webkit-inner-spin-button { '+
            'height: 20px; margin-top: 1px; }'+
            '.bc_help4 #col_close { margin-right: 30px !important; }'+
            '.bc_help4 #specified1, .bc_help4 #specified2 { width: 18px; height: 18px; '+
            'margin-right: 15px; vertical-align: -6px; border: 2px solid #fff; background: #fff; }'+
            '.bc_help4 .wpx.wpxw { margin: 0 25px 0 6px; color: #000; }'+
            '.bc_help4 .wpxw::after { right: 6px; padding-top: 1px; width: 20px; }'+
            '.bc_help4 .wpxw.lock { pointer-events: none; }'+
            '.bc_help4 #table_width, .bc_help4 #col_width { padding: 3px 6px 0 0 !important; '+
            'margin: 0; width: 72px; height: 27px; text-align: center; border: none; }'+
            '.bc_help4 #col_close, .bc_help4 #col_l, .bc_help4 #col_r, .bc_help4 #to_auto, '+
            '.bc_help4 #word_b { '+
            'padding: 2px 6px 0; margin-right: 12px; height: 26px; border: none; }'+
            '.bc_help4 #col_l { margin-left: 6px; }'+
            '.bc_help4 #col_r { margin-right: 25px; }'+
            '.bc_help4 .w_reset { margin: 0 6px 0 0; }'+
            '.bc_help4 #word_b { width: 40px; margin-right: 20px; }'+

            '#test { display: none; }'+
            '#cke_42 { top: 60px !important; left: calc( 50% - 45px) !important; }';

        if(ua==1){
            panel +=
                '.wpx::after, .wpxt::after { padding: 3px 1px 0; }'+
                '.wnc::after { padding: 3px 1px 0; }'+
                '.wnr::after { padding: 3px 1px 0; }'; }

        panel +=
            '</style>'+
            '</div>';

        if(!document.querySelector('#t_panel')){
            document.body.insertAdjacentHTML('beforeend', panel); }

    } // table_panel()



    function enhanced(){
        let target_r=document.getElementById('cke_1_contents'); // 監視 target
        let monitor_r=new MutationObserver(select);
        monitor_r.observe(target_r, {childList: true}); // ショートカット待受け開始

        select();

        function select(){
            if(document.querySelector('.cke_wysiwyg_frame') !=null){ //「通常表示」から実行開始
                remove_mark_all(); // Html編集後のリセット
                show_first(1);
                let editor_iframe=document.querySelector('.cke_wysiwyg_frame');
                let iframe_doc=editor_iframe.contentWindow.document;
                if(iframe_doc){
                    let style_if=
                        '<style id="style_if">'+
                        '.amb_active { box-shadow: #fff -4px 0px, #2196f3 -8px 0px !important; }'+
                        '.trimr_active { box-shadow: 0 -3px 0 red, inset 0 2px 0 red; }'+
                        '.trimd_active { box-shadow: -3px 0 red, inset 2px 0 0 red; }'+
                        '.trim_active { box-shadow: inset 0 0 0 50px rgba(255, 0, 0, 0.6); }'+
                        '.col_active { box-shadow: inset 0 4px #2196f3; padding-top: 6px !important; }'+
                        '.join_active { filter: invert(1); }'+
                        '</style>';

                    if(!iframe_doc.head.querySelector('#style_if')){
                        iframe_doc.head.insertAdjacentHTML('beforeend', style_if); }

                    let editor=iframe_doc.querySelector('.cke_editable');
                    if(editor){
                        editor.onclick=function(event){
                            event.stopImmediatePropagation();

                            table_keeper(); // 🟢

                            if(event.ctrlKey){
                                remove_mark_all();
                                if(task==1 || task==2 || task==3 || task==4){
                                    let elm=iframe_doc.elementFromPoint(event.clientX, event.clientY);
                                    if(elm.closest('table')!=null){
                                        let table_id=elm.closest('table').id;
                                        if(table_id && table_id.includes('ambt')){
                                            let style_tag=elm.closest('table').previousElementSibling;
                                            if(style_tag && style_tag.classList.contains(table_id)){
                                                elm.closest('table').parentNode.classList.add('amb_active');
                                                show_first(0);
                                                task=3;
                                                edit_table(task, elm.closest('table')); } //「表更新」
                                            else{
                                                remove_mark(); //「選択終了」
                                                setTimeout(()=>{
                                                    alert(
                                                        " ⛔ 旧いバージョンの 「Blog Table」で作成された表は、"+
                                                        "更新できません。\n"+
                                                        "　　選択した表を更新するには ver.3.6 以前を使用して"+
                                                        "ください");
                                                },20 );}
                                        }}

                                    else{
                                        if(elm.tagName=='P' || elm.tagName=='DIV'){
                                            elm.classList.add('amb_active');
                                            show_first(0);
                                            task=2;
                                            edit_table(task, 0); }}}} //「表作成」

                            if(event.altKey){
                                if(!event.ctrlKey){
                                    remove_mark_all();
                                    if(task==1 || task==2 || task==3 || task==4){
                                        let elm=iframe_doc.elementFromPoint(event.clientX, event.clientY);

                                        if(elm.closest('table')!=null){
                                            let selectTr;
                                            let selectTd;
                                            let Table=elm.closest('table');
                                            Table.parentNode.classList.add('amb_active');

                                            let Tr=elm.closest('tr');
                                            let allTR=Table.querySelectorAll('tbody tr');
                                            for(let k=0; k<allTR.length; k++){
                                                if(Tr==allTR[k]){
                                                    selectTr=k; } // 選択した行
                                                let Td=elm.closest('td');
                                                let allTd=allTR[k].querySelectorAll('td');
                                                for(let k=0; k<allTd.length; k++){
                                                    if(Td==allTd[k]){
                                                        selectTd=k; }}} // 選択した列

                                            if((selectTr>0 && selectTd==0) || (selectTr==0 && selectTd>=0)){
                                                trim_table(Table, selectTr, selectTd); }
                                            else{
                                                remove_mark_trim();
                                                show_first(2); }}
                                        else{
                                            remove_mark_trim();
                                            show_first(2); }}} //「表更新」列・行の修正

                                if(event.ctrlKey){
                                    remove_mark_all();
                                    if(task==1 || task==2 || task==3 || task==4){
                                        let elm=iframe_doc.elementFromPoint(event.clientX, event.clientY);

                                        if(elm.closest('table tbody')!=null){
                                            let Table=elm.closest('table');
                                            Table.parentNode.classList.add('amb_active');
                                            let Td=elm.closest('td');
                                            join_table(Table, Td); } //「表更新」列・行の結合
                                        else{
                                            remove_mark_join();
                                            show_first(6); }}}}

                        }}}}} // select()

    } // enhanced()



    function join_table(Table, selectTd){
        show_first(5);
        selectTd.classList.add('join_active');

        let join_dir=document.querySelector('#join_dir');
        let join_area=document.querySelector('#join_area');
        let join_do=document.querySelector('#join_do');


        if(selectTd.getAttribute('colspan')){
            j_dir=0; }
        else if(selectTd.getAttribute('rowspan')){
            j_dir=1; }
        if(j_dir==0){
            join_dir.value='▶';
            col_set(); }
        else{
            join_dir.value='▼';
            row_set(); }

        join_dir.onclick=function(){
            remove_mark_join();
            selectTd.classList.add('join_active');
            if(j_dir==0 && !selectTd.getAttribute('colspan')){
                j_dir=1;
                join_dir.value='▼';
                row_set(); }
            else if(j_dir==1 && !selectTd.getAttribute('rowspan')){
                j_dir=0;
                join_dir.value='▶';
                col_set(); }}



        function col_set(){
            let start=call_stp(0);
            let end;
            let tdAll=selectTd.closest('tr').querySelectorAll('td');

            let col_s=selectTd.getAttribute('colspan');
            if(col_s){
                join_area.value=col_s/1; }
            else{
                col_s=1;
                join_area.value=1; }


            join_area.oninput=function(){
                remove_mark_join();
                selectTd.classList.add('join_active');

                if(start + join_area.value/1 < tdAll.length +1){
                    end=start + join_area.value/1; }
                else{
                    join_area.value=join_area.value/1 -1; }
                for(let k=start+1; k<end; k++){
                    if(tdAll[k]){
                        act_area(k, start, col_s, tdAll[k]); }}}


            join_do.onclick=function(){
                for(let k=start+1; k<start+col_s/1; k++){
                    tdAll[k].style.display=''; }

                act_do(start, 0, 0, 'colspan');
                act_end();
                col_set(); }

        } // col_set()


        function row_set(){
            let start=call_stp(0);
            let start_r=call_stp(1);
            let end;
            let trAll=Table.querySelectorAll('tbody tr');

            let row_s=selectTd.getAttribute('rowspan');
            if(row_s){
                join_area.value=row_s/1; }
            else{
                row_s=1;
                join_area.value=1; }


            join_area.oninput=function(){
                remove_mark_join();
                selectTd.classList.add('join_active');

                if(start_r + join_area.value/1 < trAll.length +1){
                    end=start_r + join_area.value/1; }
                else{
                    join_area.value=join_area.value/1 -1; }
                for(let k=start_r+1; k<end; k++){
                    if(trAll[k]){
                        let tdAll=trAll[k].querySelectorAll('td');
                        act_area(k, start_r, row_s, tdAll[start]); }}}


            join_do.onclick=function(){
                for(let k=start_r+1; k<start_r+row_s/1 ; k++){
                    let tdAll=trAll[k].querySelectorAll('td');
                    tdAll[start].style.display=''; }

                act_do(start_r, start, 1, 'rowspan');
                act_end();
                row_set(); }

        } // row_set();


        function call_stp(n){
            let stp_d;
            let stp_r;
            let selectTr=selectTd.closest('tr');
            let tdAll=selectTr.querySelectorAll('td');
            for(let k=0; k<tdAll.length; k++){
                if(tdAll[k]==selectTd){
                    stp_d=k;
                    break; }}
            let trAll=Table.querySelectorAll('tbody tr');
            for(let k=0; k<trAll.length; k++){
                if(trAll[k]==selectTr){
                    stp_r=k;
                    break; }}
            if(n==0){
                return stp_d; }
            else{
                return stp_r; }}


        function act_area(k, stp, attr_value, scout){
            if(k>stp + attr_value/1 -1){
                if(scout.getAttribute('rowspan') ||
                   scout.getAttribute('colspan') || scout.style.display=='none'){
                    join_area.value=join_area.value/1 -1; }
                else{
                    scout.classList.add('join_active'); }} // 次の結合交差まで設定可能
            else{
                scout.classList.add('join_active'); }}


        function act_do(stp, stpd, type, attr){
            let trAll=Table.querySelectorAll('tbody tr');
            let tdAll=selectTd.closest('tr').querySelectorAll('td');

            if(join_area.value/1>1){
                let end=stp + join_area.value/1;
                for(let k=stp+1; k<end; k++){
                    if(type==0){
                        if(tdAll[k]){
                            tdAll[k].style.display='none'; }}
                    else{
                        if(trAll[k]){
                            let tdAll=trAll[k].querySelectorAll('td');
                            tdAll[stpd].style.display='none'; }}}
                selectTd.setAttribute(attr, join_area.value); }
            else{
                selectTd.removeAttribute(attr); }}


        function act_end(){
            selectTd.style.filter='invert(0)';
            selectTd.style.transition='.5s';
            setTimeout(()=>{
                selectTd.style.filter='';
                selectTd.style.transition='';
            }, 1000); }



        let join_close=document.querySelector('.join_close');
        if(join_close){
            join_close.onclick=function(){
                remove_mark_join();
                edit_table(3, Table);
                show_first(0); }}

    } // join_table()



    function trim_table(t_table, R, D){
        show_first(3);
        trim_select();

        if(trim==0){
            if(D==0 && R>0){ // 行追加処理
                let allTr=t_table.querySelectorAll('tbody tr');
                let allTd=allTr[R].querySelectorAll('td');
                for(let k=0; k<allTd.length; k++){
                    trim_color(0, 'r_mark', allTd[k]); }
                trim_action(t_table, 1, R, D); }

            if(R==0){ // 列追加処理
                let allTr=t_table.querySelectorAll('tbody tr');
                for(let k=0; k<allTr.length; k++){
                    let allTd=allTr[k].querySelectorAll('td');
                    trim_color(0, 'd_mark', allTd[D]); }
                trim_action(t_table, 2, R, D); }}

        if(trim==1){
            if(D==0 && R>0){ // 行削除処理
                let allTr=t_table.querySelectorAll('tbody tr');
                let allTd=allTr[R].querySelectorAll('td');
                for(let k=0; k<allTd.length; k++){
                    trim_color(1, 'r_mark', allTd[k]); }
                trim_action(t_table, 3, R, D); }

            if(R==0){ // 列削除処理
                let allTr=t_table.querySelectorAll('tbody tr');
                for(let k=0; k<allTr.length; k++){
                    let allTd=allTr[k].querySelectorAll('td');
                    trim_color(1, 'd_mark', allTd[D]); }
                trim_action(t_table, 4, R, D); }}


        let trim_close=document.querySelector('.trim_close');
        if(trim_close){
            trim_close.onclick=function(){
                remove_mark_trim();
                edit_table(3, t_table);
                show_first(0); }}

    } // trim_table()



    function trim_select(){
        let trim_add=document.querySelector('#trim_add');
        let trim_rem=document.querySelector('#trim_rem');
        if(trim_add && trim_rem){
            trim_set();

            trim_add.onclick=function(){
                if(trim==1){
                    trim=0;
                    trim_set(); }}

            trim_rem.onclick=function(){
                if(trim==0){
                    trim=1;
                    trim_set(); }}

            function trim_set(){
                remove_mark_trim();
                if(trim==0){
                    trim_add.style.background='#fff';
                    trim_rem.style.background='#95c3e8'; }
                else{
                    trim_add.style.background='#95c3e8';
                    trim_rem.style.background='#fff'; }}}

    } // trim_select()



    function trim_color(n, mark, cell){
        if(n==0){
            if(mark=='r_mark'){ // 行追加の表示
                cell.classList.add('trimr_active'); }
            if(mark=='d_mark'){ // 列追加の表示
                cell.classList.add('trimd_active'); }}
        if(n==1){ // 削除の表示
            cell.classList.add('trim_active'); }}



    function trim_action(t_table, type, R, D){
        let trim_do=document.querySelector('#trim_do');
        let trim_cancel=document.querySelector('#trim_cancel');

        trim_do.onclick=function(){
            if(type==1){
                add_tr(t_table, R); }
            if(type==2){
                add_td(t_table, D); }
            if(type==3){
                rem_tr(t_table, R); }
            if(type==4){
                rem_td(t_table, D); }
            remove_mark_trim();

            if(layout_fix=='fixed'){
                let t_width=document.querySelector('#t_width'); // 表全幅の設定
                t_table.style.width='max-content';
                t_width.value=real_width(t_table);
                renew_style(t_table);
                t_table.style.width=''; }

            edit_table(3, t_table);
            show_first(0); }


        trim_cancel.onclick=function(){
            remove_mark_trim();
            edit_table(3, t_table);
            show_first(0); }



        function add_tr(t_table, R){
            let allTr=t_table.querySelectorAll('tbody tr');
            let allTd=allTr[R].querySelectorAll('td');
            let clone_tr=allTr[R].cloneNode(true);
            let allTd_c=clone_tr.querySelectorAll('td');

            for(let k=0; k<allTd.length; k++){
                if(allTd[k].hasAttribute('colspan')){
                    let jump_d=allTd[k].getAttribute('colspan')/1;
                    k+=jump_d-1;
                    continue; }
                else if(allTd[k].style.display=='none'){
                    raw_fix(1, allTr, R, k); }}

            for(let k=0; k<allTd_c.length; k++){
                allTd_c[k].textContent='';
                allTd_c[k].removeAttribute('rowspan'); }
            allTr[R].parentNode.insertBefore(clone_tr, allTr[R]); }


        function add_td(t_table, D){
            let allTr=t_table.querySelectorAll('tr');

            for(let k=0; k<allTr.length; k++){
                let allTd=allTr[k].querySelectorAll('td');
                let refer_td=allTd[D];
                if(refer_td.hasAttribute('rowspan')){
                    let jump=refer_td.getAttribute('rowspan')/1;
                    k+=jump-1;
                    continue; }
                else if(refer_td.style.display=='none'){
                    col_fix(1, allTd, D); }}

            for(let k=0; k<allTr.length; k++){
                let refer_td=allTr[k].querySelectorAll('td')[D];
                let clone_td=refer_td.cloneNode(true);
                clone_td.textContent='';
                clone_td.removeAttribute('colspan');
                allTr[k].insertBefore(clone_td, refer_td); }}


        function rem_tr(t_table, R){
            let allTr=t_table.querySelectorAll('tbody tr');
            let allTd= allTr[R].querySelectorAll('td');

            for(let k=0; k<allTd.length; k++){
                if(allTd[k].hasAttribute('colspan')){
                    let jump_d=allTd[k].getAttribute('colspan')/1;
                    k+=jump_d-1;
                    continue; }
                else if(allTd[k].style.display=='none'){
                    raw_fix(0, allTr, R, k); }
                else if(allTd[k].hasAttribute('rowspan')){
                    let jump=allTd[k].getAttribute('rowspan')/1;
                    for(let kr=R+1; kr<R+jump; kr++){
                        allTr[kr].querySelectorAll('td')[k].style.display=''; }}}

            allTr[R].remove(); }


        function rem_td(t_table, D){
            let allTr=t_table.querySelectorAll('tr');

            for(let k=0; k<allTr.length; k++){
                let allTd=allTr[k].querySelectorAll('td');
                let refer_td=allTd[D];
                if(refer_td.hasAttribute('rowspan')){
                    let jump=refer_td.getAttribute('rowspan')/1;
                    k+=jump-1;
                    continue; }
                else if(refer_td.style.display=='none'){
                    col_fix(0, allTd, D); }
                else if(refer_td.hasAttribute('colspan')){
                    let jump_d=refer_td.getAttribute('colspan')/1;
                    for(let kd=D+1; kd<D+jump_d; kd++){
                        allTd[kd].style.display=''; }}}

            for(let k=0; k<allTr.length; k++){
                allTr[k].querySelectorAll('td')[D].remove(); }}


        function col_fix(type, allTd, D){
            if(type==0){ // rem
                for(let kd=D-1; kd>=0; kd--){
                    if(allTd[kd].hasAttribute('colspan')){
                        let span=allTd[kd].getAttribute('colspan')/1;
                        if(span>2){
                            allTd[kd].setAttribute('colspan', span-1); }
                        else{
                            allTd[kd].removeAttribute('colspan'); }
                        break; }}}
            else{ // add
                for(let kd=D-1; kd>=0; kd--){
                    if(allTd[kd].hasAttribute('colspan')){
                        let span=allTd[kd].getAttribute('colspan')/1;
                        allTd[kd].setAttribute('colspan', span+1);
                        break; }}}}


        function raw_fix(type, allTr, R, kd){
            if(type==0){ // rem
                for(let kr=R-1; kr>=0; kr--){
                    let allTd=allTr[kr].querySelectorAll('td');
                    if(allTd[kd].hasAttribute('rowspan')){
                        let span=allTd[kd].getAttribute('rowspan')/1;
                        if(span>2){
                            allTd[kd].setAttribute('rowspan', span-1); }
                        else{
                            allTd[kd].removeAttribute('rowspan'); }
                        break; }}}
            else{ // add
                for(let kr=R-1; kr>=0; kr--){
                    let allTd=allTr[kr].querySelectorAll('td');
                    if(allTd[kd].hasAttribute('rowspan')){
                        let span=allTd[kd].getAttribute('rowspan')/1;
                        allTd[kd].setAttribute('rowspan', span+1);
                        break; }}}}

    } // trim_action()



    function pick_color(){
        let set_color;
        let color_input_selector;
        let color_label;
        let icon_button;

        if(ua==0){
            color_label=document.querySelector('#cke_16_label');
            icon_button=document.querySelector('#cke_17'); }
        else if(ua==1){
            color_label=document.querySelector('#cke_15_label');
            icon_button=document.querySelector('#cke_16'); }

        let target_p=color_label; // 監視 アイコンのカラーラベル
        let monitor_p=new MutationObserver(get_copy);

        color_input=document.querySelectorAll('#t_panel input[type="text"]');
        for(let k=0; k<color_input.length; k++){
            input_color(k); }



        function input_color(k){
            let trust_color;

            color_input[k].onmousedown=function(event){ // 🟡
                if(event.ctrlKey==true){
                    event.preventDefault();
                    event.stopImmediatePropagation(); // 🟡
                    for(let i=0; i<color_input.length; i++){ // 他のinputの表示をリセット
                        color_input[i].style.outline=''; }
                    color_input_selector=k;
                    color_input[k].style.outline='2px solid #2196f3'; // 対象カラーinputを表示
                    icon_button.click();
                    monitor_p.observe(target_p, {attributes: true}); }
                else if(event.shiftKey==true){
                    event.preventDefault();
                    color_input_selector=k;
                    if(test_colorE(hex_bright(color_input[k].value))){
                        color_input[k].value=hex_bright(color_input[k].value); // 明度を上げる
                        sticky_color(color_input[k]); }}

            } // アイコンカラー取得開始



            color_input[k].addEventListener('change', function(event){
                event.preventDefault();
                if(test_colorE(color_input[k].value)){
                    color_input[k].value=hex_8_6(trust_color);
                    sticky_color(color_input[k]); }
                else{
                    if(color_input[k].value==''){
                        color_input[k].style.boxShadow='inset 0 0 0 1px black'; }
                    else{
                        color_input[k].style.boxShadow='inset 0 0 0 1px black'; // 担保コード
                        color_input[k].style.boxShadow=
                            'inset 0 0 0 1px black, inset 17px 0 ' + color_input[k].value+
                            ', inset 18px 0 #aaa'; }}});



            function test_colorE(color){
                let test=document.querySelector('#test');
                test.style.color='#000001';
                if(color!=''){
                    test.style.color=color; } // 入力枠が空の場合はNG判定
                let colorR=window.getComputedStyle(test).color;
                if(colorR){
                    trust_color=rgb_hex(colorR); // 適正値を6桁16進で返す

                    if(colorR!='rgb(0, 0, 1)'){
                        return true; } // 正常な色
                    else{
                        if(color=='rgb(0, 0, 1)' || color=='#000001' || color=='#000001ff'){
                            return true; } //「#000001」をテストした場合は 例外処理
                        else{
                            return false; }}}
                else{
                    return false; }}

        } // input_color()



        document.addEventListener('mousedown', function(){ // 🟡
            if(color_input[color_input_selector]){
                color_input[color_input_selector].style.outline='none'; }
            monitor_p.disconnect(); }); // カラー取得終了



        if(document.querySelector('.cke_wysiwyg_frame') !=null){
            let editor_iframe=document.querySelector('.cke_wysiwyg_frame');
            let iframe_doc=editor_iframe.contentWindow.document;
            iframe_doc.addEventListener('mousedown', function(){ // 🟡
                if(color_input[color_input_selector]){
                    color_input[color_input_selector].style.outline='none'; }
                monitor_p.disconnect(); }); } // カラー取得終了



        function get_copy(){
            set_color=color_label.getAttribute('data-color');
            color_input[color_input_selector].value='#'+ set_color;
            sticky_color(color_input[color_input_selector]);
            color_input[color_input_selector].style.outline='none';

            monitor_p.disconnect(); } // カラー取得終了



        let target_body=document.querySelector('.l-body'); // 監視 target
        let monitor_generator=new MutationObserver(stealth);
        monitor_generator.observe(target_body, {childList: true, subtree: true});

        function stealth(){
            let color_generator=document.querySelector('.ck-l-colorGenerator');
            if(color_generator){
                color_generator.addEventListener('mousedown', function(event){ // 🟡
                    event.stopImmediatePropagation(); }); }}

    } // pick_color()



    function table_position_set(){
        let wide=document.querySelector('#wide'); // 中央配置・左寄せの設定
        if(posit_set==0){
            wide.value='　▢　';
            table_position='0 auto'; }
        else if(posit_set==1){
            wide.value='▢　　';
            table_position='0 auto 0 0'; }

        wide.onclick=function(event){
            event.preventDefault();
            if(posit_set==0){
                posit_set=1;
                wide.value='▢　　';
                table_position='0 auto 0 0'; }
            else if(posit_set==1){
                posit_set=0;
                wide.value='　▢　';
                table_position='0 auto'; }}}



    function t_width_lock(r_table){
        let count=0;
        let top_td=r_table.querySelectorAll('tr:first-child td');
        for(let k=0; k<top_td.length; k++){
            if(top_td[k].style.width){
                count+=1; }}
        if(count>0){
            table_lock(1); }
        else{
            table_lock(0); }}


    function table_lock(n){
        let wpxt=document.querySelector('.wpxt'); // 表幅
        let t_width_m=document.querySelector('#t_width_m'); // MEMO
        if(n==0){
            wpxt.classList.remove('lock');
            t_width_m.classList.remove('lock'); }
        else{
            wpxt.classList.add('lock');
            t_width_m.classList.add('lock'); }}



    function table_width_memo(){
        let t_width=document.querySelector('#t_width'); // 表全幅の設定
        let t_width_m=document.querySelector('#t_width_m'); // 表のデフォルト幅の登録
        t_width_m.onclick=function(event){
            if(event.ctrlKey==false){
                event.preventDefault();
                t_width.value=setting[5]; // MEMO値を呼出して設定
                t_width_m.style.background='#00afff';
                setTimeout(()=>{
                    t_width_m.style.background='#fff';
                    t_width_m.style.transition='1s'; }, 2000);
                setTimeout(()=>{
                    t_width_m.style.transition='0s'; }, 3000); }

            else if(event.ctrlKey==true){
                let yes=window.confirm("　🔵 現在の「表幅」を「MEMO値」に登録します");
                if(yes){
                    setting[5]=t_width.value;
                    write_locals(setting); }}}} // ストレージ保存



    function td_padding_set(){
        let td_padd=document.querySelector('#td_padd'); // tdの横padding 有無の設定
        if(add_padd=='0'){
            td_padd.value='p0';
            td_padd.style.boxShadow='none'; }
        else{
            td_padd.value='p+';
            td_padd.style.boxShadow='inset 6px 0 0 #cefed0, inset -6px 0 0 #cefed0'; }

        td_padd.onclick=function(event){
            event.preventDefault();
            if(add_padd=='0'){
                add_padd='0.6';
                td_padd.value='p+';
                td_padd.style.boxShadow='inset 6px 0 0 #cefed0, inset -6px 0 0 #cefed0'; }
            else{
                add_padd='0';
                td_padd.value='p0';
                td_padd.style.boxShadow='none'; }}}



    function call_style_wb(r_table){
        let style_tag=r_table.previousElementSibling;
        let wb;
        if(style_tag){
            let t_style=style_tag.textContent;
            wb=t_style.match(/word-break: .*?;/);
            if(wb){
                wb=wb.toString().replace('word-break: ', '').replace(';', '');
                if(wb=='break-all' || wb=='break-word'){
                    return wb; }
                else{
                    return 'unset'; }}
            else{
                return 'unset'; }}}



    function lafix_set(task, r_table){
        let equal=document.querySelector('#equal'); // table-layout の設定
        if(layout_fix=='fixed'){
            equal.value='Fix';
            equal.style.background='#80deea'; }
        else{
            layout_fix='auto';
            equal.value='Auto';
            equal.style.background='#fff'; }

        equal.onclick=function(event){
            event.preventDefault();
            if(event.ctrlKey){
                if(task==3){
                    reset_width(r_table, 0); }}
            else{
                if(task==3){
                    task=4;
                    manu_width(r_table); }
                else{
                    if(layout_fix=='auto'){
                        layout_fix='fixed';
                        equal.value='Fix';
                        equal.style.background='#80deea'; }
                    else{
                        layout_fix='auto';
                        equal.value='Auto';
                        equal.style.background='#fff'; }}}}}


    function manu_width(r_table){
        let bc_help4=document.querySelector('.bc_help4');
        let col_close=document.querySelector('#col_close');
        let table_width=document.querySelector('#table_width');
        let col_width=document.querySelector('#col_width');
        let col_l=document.querySelector('#col_l');
        let col_r=document.querySelector('#col_r');
        let specified1=document.querySelector('#specified1');
        let specified2=document.querySelector('#specified2');
        let word_b=document.querySelector('#word_b');
        let to_auto=document.querySelector('#to_auto');

        show_first(4);
        spec_disp(1, 1);
        spec_disp(1, 2);

        let top_td=r_table.querySelector('tr').querySelectorAll('td');
        set_fix();

        if(!top_td[cell_set]){
            cell_set=0; }

        top_td[cell_set].classList.add('col_active');
        col_w_set(top_td[cell_set]);


        col_l.onclick=function(){
            top_td[cell_set].classList.remove('col_active');
            if(cell_set==0){
                cell_set=top_td.length -1; }
            else{
                cell_set -=1; }
            top_td[cell_set].classList.add('col_active');
            col_w_set(top_td[cell_set]); }

        col_r.onclick=function(){
            top_td[cell_set].classList.remove('col_active');
            if(cell_set==top_td.length -1){
                cell_set=0; }
            else{
                cell_set +=1; }
            top_td[cell_set].classList.add('col_active');
            col_w_set(top_td[cell_set]); }


        function col_w_set(col){
            let col_w=getComputedStyle(col).width;
            col_width.value=parseInt((col_w.replace('px', '')), 10);


            col_width.oninput=function(){
                col.style.width=col_width.value + 'px';
                set_fix(); }


            specified1.onclick=function(){
                all_set(0);
                spec_disp(0, 1);

                setTimeout(()=>{
                    all_set(1);
                    let col_w=getComputedStyle(col).width;
                    col_width.value=parseInt((col_w.replace('px', '')), 10);
                }, 200);

                setTimeout(()=>{
                    spec_disp(1, 1);
                }, 600); }


            specified2.onclick=function(){ // Auto幅
                all_set(0);
                spec_disp(0, 2);
                r_table.style.width='max-content';

                setTimeout(()=>{
                    all_set(1);

                    table_width.value=real_width(r_table);
                    let t_width=document.querySelector('#t_width'); // 表全幅の設定
                    t_width.value=table_width.value;
                    renew_style(r_table);
                    r_table.style.width='';

                    let col_w=getComputedStyle(col).width;
                    col_width.value=parseInt((col_w.replace('px', '')), 10);
                }, 200);

                setTimeout(()=>{
                    spec_disp(1, 2);
                }, 600); }

        } // col_w_set()


        if(word_break=='break-all'){
            word_b.value='No'; }
        else if(word_break=='break-word'){
            word_b.value='Yes'; }
        else{
            word_b.value='---'; }

        word_b.onclick=function(){
            if(word_b.value=='No'){
                word_break='break-word';
                word_b.value='Yes'; }
            else if(word_b.value=='Yes'){
                word_break='unset';
                word_b.value='---'; }
            else{
                word_break='break-all';
                word_b.value='No'; }
            renew_style(r_table);
            set_fix(); }


        to_auto.onclick=function(){
            reset_width(r_table, 1); }


        function set_fix(){
            all_set(1);
            layout_fix='fixed';
            word_break=call_style_wb(r_table);

            r_table.style.width='max-content';
            table_width.value=real_width(r_table);
            let t_width=document.querySelector('#t_width'); // 表全幅の設定
            t_width.value=table_width.value;
            renew_style(r_table);
            r_table.style.width=''; }


        function all_set(n){
            for(let k=0; k<top_td.length; k++){
                if(n==0){
                    if(top_td[k].style.width){
                        top_td[k].style.width=''; }}
                else{
                    let set_w=getComputedStyle(top_td[k]).width;
                    if(set_w && !top_td[k].style.width){
                        top_td[k].style.width=set_w; }}}}


        function spec_disp(n, s){
            if(n==0){
                if(s==1){
                    specified1.style.background='#fff'; }
                if(s==2){
                    specified2.style.background='#fff'; }}
            else{
                if(s==1){
                    specified1.style.background='#29b6f6'; }
                if(s==2){
                    specified2.style.background='#29b6f6'; }}}


        col_close.onclick=function(){
            task=3;
            remove_mark_col();
            show_first(0);
            edit_table(3, r_table); }

    } // manu_width()



    function reset_width(r_table, n){
        if(layout_fix=='fixed'){
            let yes=window.confirm(
                "　🔴　表のレイアウトモードを「Fix」から「Auto」に変更します。\n"+
                "　　　 現在の表幅のままで、列幅の調整が初期化されます。\n"+
                "　　　「OK」を押すと、初期化を実行します。");
            if(yes){
                let equal=document.querySelector('#equal'); // table-layout の設定
                layout_fix='auto';
                renew_style(r_table);
                equal.value='Auto';
                equal.style.background='#fff';

                let top_td=r_table.querySelector('tr').querySelectorAll('td');
                for(let k=0; k<top_td.length; k++){
                    if(top_td[k].style.width){
                        top_td[k].style.width=''; }}

                t_width_lock(r_table);

                if(n==1){ // セル幅の設定パネルの場合
                    task=3;
                    remove_mark_col();
                    show_first(0);
                    edit_table(3, r_table); }
            }}}



    function table_border_set(){
        let border_width=document.querySelector('#border_width'); // 枠線幅の設定
        let border_color=document.querySelector('#border_color'); // 枠線色の設定
        two_way();

        border_width.addEventListener('input', function(event){
            event.preventDefault();
            two_way(); });

        function two_way(){
            if(border_width.value>-1){
                table_border_color='transparent';
                cell_border_width=border_width.value;
                border_collapse='collapse';
                border_space=0; }
            else if(border_width.value<0){
                table_border_color=border_color.value;
                cell_border_width=1;
                border_collapse='separate';
                border_space=border_width.value*(-1); }}}



    function left_full_set(){
        let left_back_full=document.querySelector('#left_back_f'); // 左端色を最上行まで設定
        if(left_full==' tr:not(:first-child)'){
            left_back_full.style.color='#aaa';
            left_back_full.style.boxShadow='none'; }
        else{
            left_back_full.style.color='red';
            left_back_full.style.boxShadow='inset 0 5px red'; }

        left_back_full.onclick=function(event){
            event.preventDefault();
            if(left_full==' tr:not(:first-child)'){
                left_full=' tr';
                left_back_full.style.color='red';
                left_back_full.style.boxShadow='inset 0 5px red'; }
            else{
                left_full=' tr:not(:first-child)';
                left_back_full.style.color='#aaa';
                left_back_full.style.boxShadow='none'; }}}



    function show_color(){
        color_input=document.querySelectorAll('#t_panel input[type="text"]');
        for(let k=0; k<color_input.length; k++){
            color_input[k].value=setting[k+9];
            sticky_color(color_input[k]); }}


    function sticky_color(box){
        box.style.boxShadow='inset 17px 0 '+ box.value +', inset 18px 0 #aaa'; }



    function edit_table(task, r_table){
        let editor_iframe=document.querySelector('.cke_wysiwyg_frame');
        let iframe_doc=editor_iframe.contentWindow.document;

        let this_col; // 更新前の列数
        let this_row; // 更新前の行数
        let col=document.querySelector('#col'); // 列数の設定
        let row=document.querySelector('#row'); // 行数の設定
        let t_width=document.querySelector('#t_width'); // 表全幅の設定
        let border_width=document.querySelector('#border_width'); // 枠線幅の設定
        let border_color=document.querySelector('#border_color'); // 枠線色の設定
        let header_back=document.querySelector('#header_back'); // 最上行背景色の設定
        let left_back=document.querySelector('#left_back'); // 左端行背景色の設定
        let cell_back=document.querySelector('#cell_back'); // 全体背景色の設定
        let t_font=document.querySelector('#t_font'); // 文字サイズの設定
        let copy=document.querySelector('#copy'); // コピーボタン
        let set=document.querySelector('#set'); // 作成ボタン
        let thead_style='padding-top: 0; height: 0; border: none; background: none;';

        if(task==2){
            set.value='表作成';
            copy.style.visibility='hidden';
            table_lock(0);
            table_create(); }
        else if(task==3){
            set.value='表更新';
            copy.style.visibility='visible';
            copy_table();
            table_renew(r_table); }



        function table_create(){
            setting=read_locals();

            col.value=setting[1];
            row.value=setting[2];
            posit_set=setting[3];
            table_position_set();
            t_width.value=setting[4];
            table_width_memo();
            add_padd=setting[6];
            td_padding_set();
            layout_fix=setting[14];
            lafix_set(2, 0);
            border_width.value=setting[7];
            table_border_set();
            left_full=setting[8];
            left_full_set();
            show_color(); // inputにストレージ値をセット [9][10][11][12]
            pick_color();
            t_font.value=setting[13];
            word_break=setting[15];


            set.onclick=function(event){
                if(task==2){
                    let n_table=iframe_doc.createElement("table");
                    let rows=[];
                    for(let i=0; i<row.value; i++){
                        rows.push(n_table.insertRow(-1)); // 行の追加
                        for(let j=0; j<col.value; j++){
                            let cell=rows[i].insertCell(-1);
                            cell.appendChild(iframe_doc.createTextNode('')); }} // 列の追加

                    let th_tr=n_table.createTHead().insertRow();
                    th_tr.style.background='none';
                    th_tr.style.lineHeight='0';
                    for(let j=0; j<col.value; j++){
                        let add_td=iframe_doc.createElement('td');
                        add_td.setAttribute('style', thead_style);
                        th_tr.appendChild(add_td); } // Headerの追加

                    let table_id=new_table_id();
                    n_table.setAttribute('id', table_id);

                    let scroll_container=iframe_doc.createElement('div');
                    scroll_container.setAttribute('style', 'overflow-x: auto');

                    let selection=iframe_doc.getSelection();
                    let range=selection.getRangeAt(0);
                    let ac_node=selection.anchorNode;

                    ac_node.parentNode.insertBefore(scroll_container, ac_node);
                    scroll_container.appendChild(n_table);

                    let cn_table=iframe_doc.querySelector('#'+ table_id);
                    let t_style='<style class="'+ table_id +'">'+ set_css(table_id) +'</style>';
                    if(!iframe_doc.querySelector('.'+table_id)){
                        cn_table.insertAdjacentHTML('beforeBegin', t_style); }


                    task=3;
                    remove_mark(); // 選択表示を整形
                    show_first(0);
                    cn_table.parentNode.classList.add('amb_active');
                    edit_table(3, cn_table)

                }} // set.onclick

        } // table_create



        function table_renew(r_table){
            pick_color();
            table_width_memo();
            t_width_lock(r_table);

            let t_tr=r_table.querySelectorAll('tbody tr');
            row.value=t_tr.length;

            let t_td=r_table.querySelectorAll('tbody td');
            col.value=t_td.length / t_tr.length;

            if(!r_table.querySelector('thead')){
                let th_tr=r_table.createTHead().insertRow();
                th_tr.style.background='none';
                th_tr.style.lineHeight='0';
                for(let j=0; j<col.value; j++){
                    let add_td=iframe_doc.createElement('td');
                    add_td.setAttribute('style', thead_style);
                    if(t_td[j].style.width){
                        add_td.style.width=t_td[j].style.width; // width指定をコピー
                        t_td[j].style.width=''; } // width指定をリセット
                    th_tr.appendChild(add_td); }} // Headerの追加


            posit_set=call_style(r_table, 'posit_set');
            table_position_set();

            t_width.value=call_style(r_table, 't_width');
            t_width.onchange=function(){
                if(copy.style.visibility=='visible'){
                    renew_style(r_table);
                    t_width.value=real_width(r_table);
                    renew_style(r_table); }}

            add_padd=call_style(r_table, 'add_padd');
            td_padding_set();

            layout_fix=call_style(r_table, 'layout_fix');
            lafix_set(3, r_table);

            border_width.value=call_style(r_table, 'border_width');
            table_border_set();

            left_full=call_style(r_table, 'left_full');
            left_full_set();

            border_color.value=call_style(r_table, 'border_color');
            sticky_color(border_color);

            header_back.value=call_style(r_table, 'header_back');
            sticky_color(header_back);

            left_back.value=call_style(r_table, 'left_back');
            sticky_color(left_back);

            cell_back.value=call_style(r_table, 'cell_back');
            sticky_color(cell_back);

            t_font.value=call_style(r_table, 't_font');

            word_break=call_style_wb(r_table);


            set.onclick=function(){
                if(task==3){
                    let t_tr=r_table.querySelectorAll('tbody tr');
                    this_row=t_tr.length;
                    let t_td=r_table.querySelectorAll('tbody td');
                    this_col=t_td.length / t_tr.length;
                    let insert=[];
                    let th_tr=r_table.querySelector('thead tr');

                    let com_ok=0; // 行列の削除許可
                    if(row.value<this_row||col.value<this_col){
                        com_ok=1;
                        let ok=confirm(
                            "　🔴　行数または列数を減らす表更新が指定されています。\n"+
                            "　　 　行や列の削除で、中に記入したデータも削除されます。\n\n"+
                            "　　 　この削除を行ってもよいですか？");
                        if(ok){
                            com_ok=0; }
                        else{ ; }}

                    if(row.value>this_row){
                        for(let i=this_row; i<row.value; i++){
                            insert[i]=r_table.insertRow(-1); // 行の追加
                            for(let j=0; j<this_col; j++){
                                let cell=insert[i].insertCell(-1);
                                cell.appendChild(document.createTextNode('')); }}}
                    else if(row.value<this_row){
                        if(com_ok==0){
                            for(let i=this_row; i>row.value; i--){
                                insert[i]=r_table.deleteRow(-1); }}} // 行の削除

                    insert=r_table.querySelectorAll('tbody tr');
                    for(let i=0; i<insert.length; i++){
                        if(col.value>this_col){
                            for(let j=this_col; j<col.value; j++){
                                let cell=insert[i].insertCell(-1);
                                cell.appendChild(document.createTextNode('')); }} // 列の追加
                        else if(col.value<this_col){
                            if(com_ok==0){
                                for(let j=this_col; j>col.value; j--){
                                    let cell=insert[i].deleteCell(-1); }}}} // 列の削除

                    if(col.value>this_col){
                        for(let j=this_col; j<col.value; j++){
                            let add_td=iframe_doc.createElement('td');
                            add_td.setAttribute('style', thead_style);
                            th_tr.appendChild(add_td); }} // Headerの列追加
                    else if(col.value<this_col){
                        if(com_ok==0){
                            for(let j=this_col; j>col.value; j--){
                                th_tr.deleteCell(-1); }}} // Headerの列削除

                    renew_fix();

                    renew_style(r_table);

                    if(layout_fix=='fixed'){ //「Fix」モード時のtable幅適正化
                        let wpxt=document.querySelector('.wpxt'); // 表幅
                        if(!wpxt.classList.contains('lock')){ //「Fix」モードで幅可変の場合
                            let top_td=r_table.querySelector('tr').querySelectorAll('td');
                            for(let k=0; k<top_td.length; k++){
                                let set_w=getComputedStyle(top_td[k]).width;
                                if(set_w && !top_td[k].style.width){
                                    top_td[k].style.width=set_w; }}}
                        t_width_lock(r_table); // lock指定

                        r_table.style.width='max-content';
                        t_width.value=real_width(r_table);
                        renew_style(r_table);
                        r_table.style.width=''; }

                }} // set.onclick()


            function renew_fix(){
                let t_tr=r_table.querySelectorAll('tbody tr');
                for(let k=0; k<t_tr.length; k++){
                    let allTd=t_tr[k].querySelectorAll('td');
                    if(allTd[allTd.length-1].style.display=='none'){
                        for(let kd=allTd.length-1; kd>=0; kd--){
                            if(allTd[kd].hasAttribute('colspan')){
                                let jump_d=allTd[kd].getAttribute('colspan')/1;
                                if(kd+jump_d>allTd.length){
                                    allTd[kd].setAttribute('colspan', allTd.length-kd); }
                                break; }}}
                    else if(allTd[allTd.length-1].hasAttribute('colspan')){
                        allTd[allTd.length-1].removeAttribute('colspan'); }}


                let last_allTd=t_tr[t_tr.length-1].querySelectorAll('td');
                for(let k=0; k<last_allTd.length; k++){
                    if(last_allTd[k].hasAttribute('colspan')){
                        let jump_d=last_allTd[k].getAttribute('colspan')/1;
                        k+=jump_d-1;
                        continue; }
                    else if(last_allTd[k].style.display=='none'){
                        for(let kr=t_tr.length-1; kr>=0; kr--){
                            let tr_allTd=t_tr[kr].querySelectorAll('td');
                            if(tr_allTd[k].hasAttribute('rowspan')){
                                let jump_r=tr_allTd[k].getAttribute('rowspan')/1;
                                if(kr+jump_r>t_tr.length){
                                    tr_allTd[k].setAttribute('rowspan', t_tr.length-kr); }
                                break; }}}
                    else if(last_allTd[k].hasAttribute('rowspan')){
                        last_allTd[k].removeAttribute('rowspan'); }}

            } // renew_fix()

        } // table_renew()



        function call_style(r_table, property){
            let style_tag=r_table.previousElementSibling;
            let t_style=style_tag.textContent;
            let r_style=t_style.match(/tr:first-child {.*?}/).toString();
            let df_style=style_tag.textContent;
            let d_style=t_style.match(/td:first-child {.*?em 0;/).toString();
            if(t_style && r_style && df_style && d_style){

                switch (property){
                    case 'posit_set':
                        return c_posit(t_style);
                        break;
                    case 't_width':
                        return c_width(t_style);
                        break;
                    case 'add_padd':
                        return c_padd(d_style);
                        break;
                    case 'layout_fix':
                        return c_layout(t_style);
                        break;
                    case 'border_width':
                        return c_border_w(t_style, d_style);
                        break;
                    case 'left_full':
                        return c_full(df_style);
                        break;
                    case 'border_color':
                        return c_border_c(d_style);
                        break;
                    case 'header_back':
                        return c_header_b(r_style);
                        break;
                    case 'left_back':
                        return c_left_b(d_style);
                        break;
                    case 'cell_back':
                        return c_cell_b(t_style);
                        break;
                    case 't_font':
                        return c_font(t_style);
                        break;

                } // switch()
            }


            function c_posit(t_style){
                if(t_style.match(/margin: 0 auto 0 0;/)){
                    return 1; }
                else{
                    return 0; }}

            function c_width(t_style){
                let c_width=t_style.match(/width: .*?px;/);
                if(c_width){
                    c_width=c_width.toString().replace(/[^0-9]/g, '');
                    if(c_width/1<10){
                        return real_width(r_table); }
                    else{
                        return c_width/1; }}
                else{
                    return real_width(r_table); }}

            function c_padd(d_style){
                let add_padd=d_style.match(/padding: 0.2em .*?em/);
                if(add_padd){
                    add_padd=add_padd.toString().replace('padding: 0.2em ', '').replace('em', '');
                    return add_padd; }
                else{
                    return '0.6'; }}

            function c_layout(t_style){
                layout_fix=t_style.match(/table-layout: .*?;/);
                if(layout_fix){
                    layout_fix=layout_fix.toString().replace('table-layout: ', '').replace(';', ''); }
                else{
                    layout_fix='auto'; }
                return layout_fix; }

            function c_border_w(t_style, d_style){
                let border_width=d_style.match(/border: .*?px solid/);
                if(border_width){
                    border_width=border_width.toString().replace(/[^0-9]/g, ''); }
                else{
                    border_width=1; }
                let border_space=t_style.match(/border-spacing: .*?px;/);
                if(border_space){
                    border_space=border_space.toString().replace(/[^0-9]/g, ''); }
                else{
                    border_space=0; }

                if(border_space!=0){
                    return border_space*(-1); }
                else{
                    return border_width; }}

            function c_full(df_style){
                if(df_style.match(/tr:not\(:first-child\)/)){
                    return ' tr:not(:first-child)'; }
                else{
                    return ' tr'; }}

            function c_border_c(d_style){
                let border_color=d_style.match(/px solid .*?;/);
                if(border_color){
                    border_color=border_color.toString().replace('px solid ', '').replace(';', ''); }
                else{
                    border_color='#999'; }
                return rgb_hex(border_color); }

            function c_header_b(r_style){
                let header_back=r_style.match(/-color: .*?;/);
                if(header_back){
                    header_back=header_back.toString().replace('-color: ', '').replace(';', ''); }
                else{
                    header_back='#F4F4F4'; }
                return rgb_hex(header_back); }

            function c_left_b(d_style){
                let left_back=d_style.match(/-color: .*?;/);
                if(left_back){
                    left_back=left_back.toString().replace('-color: ', '').replace(';', ''); }
                else{
                    left_back='#F4F4F4'; }
                return rgb_hex(left_back); }

            function c_cell_b(t_style){
                let cell_back=t_style.match(/-color: .*?;/);
                if(cell_back){
                    cell_back=cell_back.toString().replace('-color: ', '').replace(';', ''); }
                else{
                    cell_back='#FFF'; }
                return rgb_hex(cell_back); }

            function c_font(t_style){
                let font_size=t_style.match(/font: .*?px Meiryo/);
                if(font_size){
                    font_size=font_size.toString().replace(/[^0-9]/g, ''); }
                else{
                    font_size=16; }
                return font_size/1; }

        } // call_style()



        function copy_table(){
            copy.onclick=function(){
                if(task==3){
                    let yes=window.confirm(
                        "　🔵 選択した表の「設定」をコピーして\n"+
                        "　　  新規作成の表の初期値にします");
                    if(yes){
                        setting[1]=col.value;
                        setting[2]=row.value;
                        setting[3]=posit_set;
                        setting[4]=t_width.value;
                        setting[6]=add_padd;
                        setting[7]=border_width.value;
                        setting[8]=left_full;
                        setting[9]=border_color.value;
                        setting[10]=header_back.value;
                        setting[11]=left_back.value;
                        setting[12]=cell_back.value;
                        setting[13]=t_font.value;
                        setting[14]=layout_fix;
                        setting[15]=word_break;

                        write_locals(setting); }}}} // ストレージ 保存

    } // edit_table()



    function renew_style(r_table){
        let table_id=r_table.id;
        let table_style=r_table.parentElement.querySelector('.'+ table_id);
        if(table_style){
            table_style.textContent=set_css(table_id); }
        else{
            let t_style='<style class="'+ table_id +'">'+ set_css(table_id) +'</style>';
            r_table.insertAdjacentHTML('beforeBegin', t_style); }}


    function set_css(t_id){
        let t_width=document.querySelector('#t_width'); // 表全幅の設定
        let border_color=document.querySelector('#border_color'); // 枠線色の設定
        let header_back=document.querySelector('#header_back'); // 最上行背景色の設定
        let left_back=document.querySelector('#left_back'); // 左端行背景色の設定
        let cell_back=document.querySelector('#cell_back'); // 全体背景色の設定
        let t_font=document.querySelector('#t_font'); // 文字サイズの設定

        table_border_set();

        let css_bottom;
        if(border_space%2==0){
            css_bottom=''; }
        else{
            css_bottom='padding-bottom: 1px; '; }

        let css_tbody;
        if(border_space>1){
            let gap=Math.floor(border_space/2);
            css_tbody='#'+ t_id + ' tbody { background-color: '+ cell_back.value +'; '+
                'position: relative; top: -'+ gap +'px; } '; }
        else{
            css_tbody='#'+ t_id + ' tbody { background-color: '+ cell_back.value +'; } '; }

        let css=
            '#'+ t_id + ' { '+
            'width: '+ t_width.value +'px; '+
            'margin: '+ table_position +'; '+
            'table-layout: '+ layout_fix +'; '+
            'border-collapse: '+ border_collapse +'; '+
            'border-spacing: '+ border_space +'px; '+
            'border: 1px solid '+ table_border_color +'; '+
            'font: '+ t_font.value +'px Meiryo; '+
            'word-break: '+ word_break +'; '+
            css_bottom +'} '+
            css_tbody +
            '#'+ t_id +' tr:first-child { background-color: '+ header_back.value +'; } '+
            '#'+ t_id + left_full +' td:first-child { background-color: '+ left_back.value +'; } '+
            '#'+ t_id +' td { border: '+ cell_border_width +'px solid '+ border_color.value +
            '; padding: 0.2em '+ add_padd +'em 0; height: 1.5em; }';

        return css; }



    function new_table_id(){ // 複数tableを生成時に異なるidを付ける
        if(document.querySelector('.cke_wysiwyg_frame') !=null){
            let editor_iframe=document.querySelector('.cke_wysiwyg_frame');
            let iframe_doc=editor_iframe.contentWindow.document;
            for(let k=0; k<100; k++){
                let table_id='ambt'+k;
                if(iframe_doc.getElementById(table_id)==null){
                    return table_id; }}}}



    function real_width(table){
        let width_g=getComputedStyle(table).width;
        if(width_g){
            width_g=Math.ceil((width_g.replace('px', ''))); } // 切り上げ
        else{
            width_g=580; }
        return width_g; }



    function remove_t_panel(){
        document.querySelector('#t_panel').remove(); }



    function remove_mark(){
        if(document.querySelector('.cke_wysiwyg_frame') !=null){ //「通常表示」から実行開始
            let editor_iframe=document.querySelector('.cke_wysiwyg_frame');
            let iframe_doc=editor_iframe.contentWindow.document;

            let item=iframe_doc.querySelectorAll('.amb_active');
            for(let k=0; k<item.length; k++){
                item[k].classList.remove('amb_active'); }}}



    function remove_mark_trim(){
        if(document.querySelector('.cke_wysiwyg_frame') !=null){ //「通常表示」から実行開始
            let editor_iframe=document.querySelector('.cke_wysiwyg_frame');
            let iframe_doc=editor_iframe.contentWindow.document;

            let trimr=iframe_doc.querySelectorAll('.trimr_active');
            for(let k=0; k<trimr.length; k++){
                trimr[k].classList.remove('trimr_active'); }

            let trimd=iframe_doc.querySelectorAll('.trimd_active');
            for(let k=0; k<trimd.length; k++){
                trimd[k].classList.remove('trimd_active'); }

            let trim=iframe_doc.querySelectorAll('.trim_active');
            for(let k=0; k<trim.length; k++){
                trim[k].classList.remove('trim_active'); }}}



    function remove_mark_col(){
        if(document.querySelector('.cke_wysiwyg_frame') !=null){ //「通常表示」から実行開始
            let editor_iframe=document.querySelector('.cke_wysiwyg_frame');
            let iframe_doc=editor_iframe.contentWindow.document;

            let col=iframe_doc.querySelectorAll('.col_active');
            for(let k=0; k<col.length; k++){
                col[k].classList.remove('col_active'); }}}



    function remove_mark_join(){
        if(document.querySelector('.cke_wysiwyg_frame') !=null){ //「通常表示」から実行開始
            let editor_iframe=document.querySelector('.cke_wysiwyg_frame');
            let iframe_doc=editor_iframe.contentWindow.document;
            let join=iframe_doc.querySelectorAll('.join_active');
            for(let k=0; k<join.length; k++){
                join[k].classList.remove('join_active'); }}}



    function remove_mark_all(){
        remove_mark();
        remove_mark_trim();
        remove_mark_col();
        remove_mark_join(); }



    function show_first(n){
        let first=document.querySelector('#first');
        let bt_help1=document.querySelector('.bt_help1');
        let bt_help2=document.querySelector('.bt_help2');
        let bt_help3=document.querySelector('.bt_help3');
        let bc_help4=document.querySelector('.bc_help4');
        let bt_help5=document.querySelector('.bt_help5');
        let bt_help6=document.querySelector('.bt_help6');
        if(first){
            if(n==0){
                first.style.display='none'; }
            else{
                first.style.display='block';
                bt_help1.style.display='none';
                bt_help2.style.display='none';
                bt_help3.style.display='none';
                bc_help4.style.display='none';
                bt_help5.style.display='none';
                bt_help6.style.display='none';
                if(n==1){
                    bt_help1.style.display='block'; }
                if(n==2){
                    bt_help2.style.display='block'; }
                if(n==3){
                    bt_help3.style.display='block'; }
                if(n==4){
                    bc_help4.style.display='block'; }
                if(n==5){
                    bt_help5.style.display='block'; }
                if(n==6){
                    bt_help6.style.display='block'; }}}

        let bt_help=document.querySelector('#bt_help');
        if(bt_help){
            bt_help.onclick=function(){
                let url='https://ameblo.jp/personwritep/entry-12703182424.html';
                window.open(url, target="_blank"); }}}



    function equal_color(R, G, B, A){ // RGBは整数 Aは小数が必須 ➔ 等価 6桁hexコードに変換
        return '#'
            + tohex(upColor(R, A))
            + tohex(upColor(G, A))
            + tohex(upColor(B, A));

        function upColor(value, A){
            let color_value=value*A + 255*(1 - A);
            return Math.floor(color_value); }

        function tohex(value){
            return ('0'+ value.toString(16)).slice(-2); }}



    function hex_bright(hex){ // 明度を段階的に変換
        if(hex.slice(0, 1)=='#'){
            hex=hex.slice(1); }
        if(hex.length==3){
            hex=hex.slice(0,1) + hex.slice(0,1) + hex.slice(1,2) + hex.slice(1,2) +
                hex.slice(2,3) + hex.slice(2,3); }
        // 透過度 0.6 とした色値に変更
        let R=parseInt(hex.slice(0, 2), 16);
        let G=parseInt(hex.slice(2, 4), 16);
        let B=parseInt(hex.slice(4, 6), 16);

        return equal_color(R, G, B, 0.6); } // 非透過色値に変更



    function hex_8_6(hex){ // 8桁hex値を6桁hexに変換
        if(hex.length!=9 || hex.slice(0, 1)!='#'){
            return hex; }
        else{
            hex=hex.slice(1);

            let R=parseInt(hex.slice(0, 2), 16);
            let G=parseInt(hex.slice(2, 4), 16);
            let B=parseInt(hex.slice(4, 6), 16);
            let A=hex.slice(6, 8);
            // 16進の「A値」を透過度（小数）に変更
            let alp=0;
            for(let i=0; i<2; i++){
                alp +=Math.pow(16, -(i + 1))*parseInt(A[i], 16); }

            return equal_color(R, G, B, alp); }} // 非透過色値に変更



    function rgb_hex(color){ // rgb or rgba 表記をhex6桁表記に変換
        if(color.includes('#')){ // hex表記の場合
            return color; }
        else{ // rgb表記の場合
            color=color.split('(')[1].split(')')[0].replace(/ /g, '');
            let rgb_ar=color.split(',');

            let R=parseInt(rgb_ar[0], 10);
            let G=parseInt(rgb_ar[1], 10);
            let B=parseInt(rgb_ar[2], 10);
            let A;
            if(rgb_ar.length==3){
                A=1; }
            else if(rgb_ar.length==4){
                A=parseFloat(rgb_ar[3]); }

            return equal_color(R, G, B, A); }} // 非透過色値に変更



    function table_keeper(){ // 🟢
        if(document.querySelector('.cke_wysiwyg_frame') !=null){ //「通常表示」から実行開始
            let editor_iframe=document.querySelector('.cke_wysiwyg_frame');
            if(editor_iframe){
                let iframe_doc=editor_iframe.contentWindow.document;
                if(iframe_doc){
                    let iframe_body=iframe_doc.body;
                    if(iframe_body){

                        let style=iframe_body.querySelectorAll('style');
                        for(let k=0; k<style.length; k++){
                            let class_name=style[k].className;
                            if(class_name && class_name.indexOf('ambt')!=-1){
                                if(style[k].nextElementSibling){
                                    let id=style[k].nextElementSibling.id;
                                    if(!id || id.indexOf('ambt')==-1){
                                        style[k].remove(); }}
                                else{
                                    style[k].remove(); }}}

                        let table_list=[]; // 重複チェック用配列
                        let ovlap; // 重複id名
                        let tables=iframe_body.querySelectorAll('table');
                        for(let k=0; k<tables.length; k++){
                            let id_name=tables[k].id;
                            if(id_name && id_name.indexOf('ambt')!=-1){
                                if(table_list.indexOf(id_name)==-1){
                                    table_list.push(id_name); }
                                else{
                                    ovlap=id_name;
                                    break; }}}

                        if(ovlap){
                            let new_id=new_table_id();
                            let ovlap_table=iframe_body.querySelectorAll('#'+ovlap);
                            if(ovlap_table[1]){
                                ovlap_table[1].style.filter='invert(1)';

                                setTimeout(()=>{
                                    let yes=window.confirm("　🔴 重複した表のIDを変更して良いですか？");
                                    if(yes){
                                        ovlap_table[1].id=new_id;
                                        let style_tag=ovlap_table[1].previousElementSibling;
                                        if(style_tag && style_tag.classList.contains(ovlap)){
                                            style_tag.className=new_id;
                                            let style_text=style_tag.textContent;
                                            style_tag.textContent=style_text.replaceAll(ovlap, new_id); }
                                        alert("表のID変更処理をしました\n\n"+
                                              ovlap +" ➔ "+ new_id); }

                                    ovlap_table[1].style.filter='';
                                }, 600 ); }}

                    }}}}
    } // table_keeper();



    function before_end(){
        let submitButton=document.querySelectorAll('.js-submitButton');
        submitButton[0].addEventListener('mousedown', all_clear, false);
        submitButton[1].addEventListener('mousedown', all_clear, false);

        function all_clear(){
            let editor_iframe=document.querySelector('.cke_wysiwyg_frame');
            if(!editor_iframe){ //「HTML表示」編集画面の場合
                alert("⛔　Blog Table が処理を終了していません\n\n"+
                      "　　 通常表示画面に戻り 編集を終了してください");
                event.stopImmediatePropagation();
                event.preventDefault(); }
            if(editor_iframe){ //「通常表示」編集画面の場合
                remove_mark_all();
                table_keeper(); } // table編集・TRIM・COLのマークを削除 🟢
        }} // before_end(

} // main()
