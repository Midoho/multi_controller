//===============================================================
// メニュー制御用の関数とイベント設定（※バージョン2026-4｜オーバーレイ対応版）
//===============================================================
$(function(){
  //-------------------------------------------------
  // 変数の宣言
  //-------------------------------------------------
  const $menubar = $('#menubar');
  const $menubarHdr = $('#menubar_hdr');
  const $overlay = $('#menubar-overlay');
  const breakPoint = 9999;	// ここがブレイクポイント指定箇所です

  // ▼ここを切り替えるだけで 2パターンを使い分け！
  //   false → “従来どおり”
  //   true  → “ハンバーガーが非表示の間は #menubar も非表示”
  const HIDE_MENUBAR_IF_HDR_HIDDEN = false;

  // タッチデバイスかどうかの判定
  const isTouchDevice = ('ontouchstart' in window) ||
                       (navigator.maxTouchPoints > 0) ||
                       (navigator.msMaxTouchPoints > 0);

  //-------------------------------------------------
  // debounce(処理の呼び出し頻度を抑制) 関数
  //-------------------------------------------------
  function debounce(fn, wait) {
    let timerId;
    return function(...args) {
      if (timerId) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        fn.apply(this, args);
      }, wait);
    };
  }

  //-------------------------------------------------
  // メニューを閉じる共通関数
  // ※ハンバーガー解除・メニュー非表示・オーバーレイ非表示・
  //   noscroll解除・ドロップダウン閉じ を一括で行う
  //-------------------------------------------------
  function closeMenu() {
    $menubarHdr.removeClass('ham');
    $menubar.hide();
    $overlay.hide();
    $menubar.find('.ddmenu_parent ul').hide();
    $('body').removeClass('noscroll');
  }

  //-------------------------------------------------
  // メニューを開く共通関数
  //-------------------------------------------------
  function openMenu() {
    $menubarHdr.addClass('ham');
    $menubar.show();
    $overlay.show();
    $menubar.find('.ddmenu_parent ul').hide();
    if ($(window).width() < breakPoint) {
      $('body').addClass('noscroll');
    }
  }

  //-------------------------------------------------
  // ドロップダウン用の初期化関数
  //-------------------------------------------------
  function initDropdown($menu, isTouch) {
    // ドロップダウンメニューが存在するliにクラス追加
    $menu.find('ul li').each(function() {
      if ($(this).find('ul').length) {
        $(this).addClass('ddmenu_parent');
        $(this).children('a').addClass('ddmenu');
      }
    });

    // 子メニューは初期状態で閉じる（ちらつき防止）
    $menu.find('.ddmenu_parent ul').hide();

    // 万一の再初期化に備えてイベントを解除（多重バインド防止）
    $menu.find('.ddmenu').off('click.ddmenu');
    $menu.find('.ddmenu_parent').off('mouseenter.ddmenu mouseleave.ddmenu');

    //---------------------------------------------
    // ▼ブレイクポイント未満（開閉メニュー時）は
    //   PCでも「クリックで開閉」に統一（hover無効）
    //---------------------------------------------
    $menu.find('.ddmenu').on('click.ddmenu', function(e) {
      if (!isTouch && $(window).width() >= breakPoint) return; // PC大画面はhover運用

      e.preventDefault();
      e.stopPropagation();

      const $dropdownMenu = $(this).siblings('ul');
      if ($dropdownMenu.is(':visible')) {
        $dropdownMenu.hide();
      } else {
        $menu.find('.ddmenu_parent ul').hide(); // 他を閉じる
        $dropdownMenu.show();
      }
    });

    //---------------------------------------------
    // ▼PC大画面（breakPoint以上）のみ hover で開閉
    //---------------------------------------------
    $menu.find('.ddmenu_parent').on('mouseenter.ddmenu', function() {
      if (isTouch) return;
      if ($(window).width() < breakPoint) return; // 開閉メニュー時はhover無効
      $(this).children('ul').show();
    }).on('mouseleave.ddmenu', function() {
      if (isTouch) return;
      if ($(window).width() < breakPoint) return; // 開閉メニュー時はhover無効
      $(this).children('ul').hide();
    });
  }

  //-------------------------------------------------
  // ハンバーガーメニューでの開閉制御関数
  //-------------------------------------------------
  function initHamburger($hamburger) {
    let isAnimating = false;	// 連打防止用フラグ
    $hamburger.on('click', function() {
      if (isAnimating) return;	// アニメーション中は何もしない
      isAnimating = true;

      if ($(this).hasClass('ham')) {
        // 開いている → 閉じる
        closeMenu();
      } else {
        // 閉じている → 開く
        openMenu();
      }

      // メニューのCSSアニメーション(0.2s)完了後にロック解除
      setTimeout(function() { isAnimating = false; }, 300);
    });
  }

  //-------------------------------------------------
  // オーバーレイクリックでメニューを閉じる
  //-------------------------------------------------
  $overlay.on('click', function() {
    closeMenu();
  });

  //-------------------------------------------------
  // レスポンシブ時の表示制御 (リサイズ時)
  //-------------------------------------------------
  const handleResize = debounce(function() {
    const windowWidth = $(window).width();

    // bodyクラスの制御 (small-screen / large-screen)
    if (windowWidth < breakPoint) {
      $('body').removeClass('large-screen').addClass('small-screen');
    } else {
      $('body').removeClass('small-screen').addClass('large-screen');
      // PC表示になったら、ハンバーガー解除 + メニュー・オーバーレイを閉じる
      $menubarHdr.removeClass('ham');
      $menubar.find('.ddmenu_parent ul').hide();
      $overlay.hide();
      $('body').removeClass('noscroll');

      // ▼ #menubar を表示するか/しないかの切り替え
      if (HIDE_MENUBAR_IF_HDR_HIDDEN) {
        $menubarHdr.hide();
        $menubar.hide();
      } else {
        $menubarHdr.hide();
        $menubar.show();
      }
    }

    // スマホ(ブレイクポイント未満)のとき
    if (windowWidth < breakPoint) {
      $menubarHdr.show();
      if (!$menubarHdr.hasClass('ham')) {
        $menubar.hide();
        $overlay.hide();
        $('body').removeClass('noscroll');
      }
    }
  }, 200);

  //-------------------------------------------------
  // 初期化
  //-------------------------------------------------
  // 1) ドロップダウン初期化 (#menubar)
  initDropdown($menubar, isTouchDevice);

  // 2) ハンバーガーメニュー初期化 (#menubar_hdr)
  initHamburger($menubarHdr);

  // 3) レスポンシブ表示の初期処理 & リサイズイベント
  handleResize();
  $(window).on('resize', handleResize);

  //-------------------------------------------------
  // アンカーリンク(#)のクリックイベント
  //-------------------------------------------------
  $menubar.find('a[href*="#"]').on('click', function() {
    // ドロップダウンメニューの親(a.ddmenu)のリンクはメニューを閉じない
    if ($(this).hasClass('ddmenu')) return;

    // スマホ表示＆ハンバーガーが開いている状態なら閉じる
    if ($menubarHdr.is(':visible') && $menubarHdr.hasClass('ham')) {
      closeMenu();
    }
  });

  //-------------------------------------------------
  // 「header nav」など別メニューにドロップダウンだけ適用したい場合
  //-------------------------------------------------
  // 例：header nav へドロップダウンだけ適用（ハンバーガー連動なし）
  //initDropdown($('header nav'), isTouchDevice);
});


//===============================================================
// スムーススクロール（※バージョン2026-08-02）
// 通常タイプ / fixedヘッダー対応 切り替え版
//===============================================================
$(function() {

    //===========================================================
    // 設定
    //===========================================================
    // 'normal' ＝ 通常タイプ（固定ヘッダーなし）
    // 'fixed' ＝ fixedヘッダー対応
    var scrollType = 'normal';

    // fixedヘッダー時に位置計算に使う要素（※fixed版を使う際は必ずチェック。画面上部に貼り付くブロックを指定する。）
    // 例：'header' / '#header' / '.site-header'
    var fixedHeaderSelector = '#menubar';

    // ページ上部へ戻るボタンのセレクター
    var topButton = $('.pagetop');

    // ページトップボタン表示用のクラス名
    var scrollShow = 'pagetop-show';


    //===========================================================
    // fixedヘッダーぶんの補正値を取得
    //===========================================================
    function getHeaderOffset() {

        // 通常タイプなら補正なし
        if(scrollType !== 'fixed') {
            return 0;
        }

        // 指定要素を取得
        var $header = $(fixedHeaderSelector);

        // 要素がなければ補正なし
        if(!$header.length) {
            return 0;
        }

        // 画面上でのヘッダー下端位置を取得
        // 高さ + 上部の余白(topやmarginで見た目上ずれている分)も含めて見られる
        var rect = $header.get(0).getBoundingClientRect();

        // 念のためマイナスは0にする
        return Math.max(0, rect.bottom);
    }


    //===========================================================
    // スムーススクロール本体
    //===========================================================
    function smoothScroll(target) {

        var scrollTo = 0;

        // '#' の場合はページ最上部へ
        if(target === '#') {
            scrollTo = 0;

        } else {

            // スクロール先の要素を取得
            var $target = $(target);

            // 対象が存在しない場合は何もしない
            if(!$target.length) {
                return;
            }

            // 通常位置から、fixedヘッダー分を引く
            scrollTo = $target.offset().top - getHeaderOffset();

            // 0未満にならないように補正
            if(scrollTo < 0) {
                scrollTo = 0;
            }
        }

        // アニメーションでスムーススクロール
        $('html, body').animate({scrollTop: scrollTo}, 500);
    }

	//===========================================================
	// ページ内リンク / ページトップボタン
	//===========================================================
	$('a[href*="#"], .pagetop').click(function(e) {

		// ページトップボタン → 最上部へ
		if($(this).hasClass('pagetop')) {
			e.preventDefault();
			smoothScroll('#');
			return;
		}

		// このリンクのハッシュ（例 "#contact"）。<a>要素がURLを自動解決してくれる。
		var hash = this.hash;

		// href="#"（その場に止める）／ハッシュ無しの通常リンクは触らない
		if(!hash || hash === '#') {
			if(($(this).attr('href') || '') === '#') e.preventDefault();
			return;
		}

		// リンク先が「今いるページ」のときだけスムーススクロール。
		//   "#id" でも "service.html#id" でも、現在ページ＋ハッシュなら同一ページ扱い。
		//   別ページ・外部サイト宛てはそのまま遷移させ、読み込み後に下の「ハッシュ付きURLで開いた時」がスクロールする。
		if(this.host !== location.host || this.pathname !== location.pathname || this.search !== location.search) return;

		if($(hash).length) {
			e.preventDefault();
			smoothScroll(hash);
		}
	});

    //===========================================================
    // ページトップボタンの表示切り替え
    //===========================================================
    $(topButton).hide();

    $(window).scroll(function() {
        if($(this).scrollTop() >= 300) {
            $(topButton).fadeIn().addClass(scrollShow);
        } else {
            $(topButton).fadeOut().removeClass(scrollShow);
        }
    });


    //===========================================================
    // ハッシュ付きURLで開いた時
    //===========================================================
    if(window.location.hash) {
        $('html, body').scrollTop(0);

        setTimeout(function() {
            smoothScroll(window.location.hash);
        }, 500);
    }

});


//===============================================================
// 動画（見えない間はストップ）複数対応版
// html側の.video-zoneと.bgVideoの付与を忘れず。
//===============================================================
(() => {
  const zones = document.querySelectorAll(".video-zone");
  if (!zones.length) return;

  // 省データ/動き少なめ希望は静止画のまま
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const saveData = navigator.connection?.saveData;
  if (reduceMotion || saveData) {
    zones.forEach(zone => {
      const v = zone.querySelector("video");
      if (!v) return;
      try { v.pause(); } catch(e) {}
    });
    return;
  }

  const instances = [];

  zones.forEach(zone => {
    // zoneの中の video を対象に（.bgVideoがあれば優先）
    const v = zone.querySelector("video.bgVideo") || zone.querySelector("video");
    if (!v) return;

    const playSafe  = () => v.play().catch(() => {});
    const pauseSafe = () => {
      try { v.pause(); } catch(e) {}
      try { v.currentTime = 0; } catch(e) {}
    };

    let startedLoading = false;
    const startLoadingOnce = () => {
      if (startedLoading) return;
      startedLoading = true;
      try { v.preload = "auto"; } catch(e) {}
      try { v.load(); } catch(e) {}
    };

    let zoneVisible = false;

    const update = () => {
      if (document.hidden) { pauseSafe(); return; }

      if (zoneVisible) {
        startLoadingOnce();
        playSafe();
      } else {
        pauseSafe();
      }
    };

    // 初期状態（ページ途中から開いた時など）
    const r = zone.getBoundingClientRect();
    zoneVisible = (r.bottom > 0 && r.top < window.innerHeight);
    update();

    instances.push({
      zone,
      setVisible: (vis) => { zoneVisible = vis; update(); },
      update,
      pauseSafe,
    });
  });

  if (!instances.length) return;

  const map = new Map(instances.map(inst => [inst.zone, inst]));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const inst = map.get(e.target);
      if (!inst) return;
      inst.setVisible(e.isIntersecting);
    });
  }, { threshold: 0.01 });

  instances.forEach(inst => io.observe(inst.zone));

  // タブ非表示なら停止
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) instances.forEach(inst => inst.pauseSafe());
    else instances.forEach(inst => inst.update());
  });
})();
