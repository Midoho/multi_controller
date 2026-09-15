/* -------------------------------------------------
	inview 一括設定（セクション/要素ごとに data-fx で効果指定）
	使える値：up / down / transform1 / transform2 / transform3 / blur
------------------------------------------------- */

const FX_DEFAULT = 'up';	// data-fx が無い時のデフォルト

$(function(){

	const FX_LIST = ['up','down','transform1','transform2','transform3','blur'];
	const STYLE_LIST = FX_LIST.map(v => v + 'style');
	const CLEAN = FX_LIST.concat(STYLE_LIST).join(' ');

	function resolveFx($el){
		// 自分自身〜親へ、data-fx を探す（要素単位/セクション単位どっちもOK）
		let fx = $el.closest('[data-fx]').attr('data-fx');

		// data-fx が無ければデフォルト
		if(!fx) fx = FX_DEFAULT;

		// 想定外の値ならデフォルトに戻す
		if(FX_LIST.indexOf(fx) === -1) fx = FX_DEFAULT;

		return fx;
	}

	$('.inview').each(function(){
		const $el = $(this);
		const fx = resolveFx($el);

		// 既存の効果classが混ざってても、ここで綺麗にして「待機状態」にする
		$el.removeClass(CLEAN).addClass(fx);

		// 画面内に入ったら「実行class」を付ける
		$el.on('inview', function(event, isInView){
			if(isInView){
				$el.addClass(fx + 'style');
			}
		});
	});

	// リロード直後に表示位置が途中でも反映されやすくする（環境によって有効）
	setTimeout(function(){
		$(window).trigger('scroll');
	}, 0);

});
