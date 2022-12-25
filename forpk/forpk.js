(() => {
  /** 変換してほしくない単語のリスト
   * 配信者さんの名前とかを想定してます
   * 一応正規表現も使えます
  */
  const denylist = [
    // "葛飾北斎",
    // "[東南西北]家"
  ]

  const cardImages = []

  /** 変換してほしくない単語をプレースホルダに置き換える */
  const _escapeDnyExp = (text, table) => {
    denylist.forEach((dny, idx) => {
      const exp = new RegExp(dny, 'g')
      const hld = `{dny_${idx}}`
      const escs = text.match(exp) || []
      text = text.replace(exp, hld)
      table[hld] = escs
    })
    return [text, table]
  }
  /** 波かっこ付き文字列をプレースホルダに置き換える */
  const _escapeBrcExp = (text, table) => {
    const exp = /(?:\{[^\}]+?\})|(?:｛[^｝]+?｝)/g
    const hld = '{brc}'
    const escs = (text.match(exp) || []).map((esc) => esc.slice(1, -1))
    text = text.replace(exp, hld)
    table[hld] = escs
    return [text, table]
  }
  /** imgをプレースホルダに置き換える */
  const _escapeImgExp = (text, table, key) => {
    const exp = /<img (".*?"|'.*?'|[^'"])+?>/g
    const hld = `{img_${key}}`
    const escs = text.match(exp) || []
    text = text.replace(exp, hld)
    table[hld] = escs
    return [text, table]
  }
  /** urlをプレースホルダに置き換える */
  const _escapeUrlExp = (text, table) => {
    const exp = /https?:\/\/[\w:%#&~=\/\$\?\(\)\.\+\-]+/g
    const hld = '{url}'
    const escs = text.match(exp) || []
    text = text.replace(exp, hld)
    table[hld] = escs
    return [text, table]
  }
  /** プレースホルダを文字列に戻す */
  const _revertEscExp = (text, table) => {
    Object.entries(table).forEach(([hld, escs]) => {
      escs.forEach((esc) => {
        text = text.replace(hld, esc)
      })
    })
    return text
  }

  /** hdsc表記(半角)をsvgに置き換える */
  const _replaceEnHdscExp = (text, color) => {
    const exp = new RegExp(`(?:[A23456789TJQK][hdsc])+`, 'g')
    text = text.replace(exp, (match) => {
      match = match.replace(/[A23456789TJQK][hdsc]/g, (card) => {
        return _card2img(card[1], card[0], color)
      })
      return match
    })
    return text
  }

  /** hdsc表記(全角)をsvgに置き換える */
  const _replaceEmHdscExp = (text, color) => {
    const exp = new RegExp(`(?:[Ａ２３４５６７８９ＴＪＱＫ][ｈｄｓｃ])+`, 'g')
    text = text.replace(exp, (match) => {
      match = match.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (x) => {
        return String.fromCharCode(x.charCodeAt(0) - 0xFEE0)
      })
      return _replaceEnHdscExp(match, color)
    })
    return text
  }

  /** スートとランクをimgに置き換える */
  const _card2img = (suit, rank, color) => {
    const suits = color ? 'hdsc--' : 'h-s-dc'
    const ranks = 'A23456789TJQK'
    const suitId = suits.indexOf(suit)
    const rankId = ranks.indexOf(rank)
    const src = cardImages[suitId][rankId]
    return `<img class="card" src="${src}" alt="${suit}${rank}" />`
  }

  /** カード画像を読み込む */
  const _loadCardImage = () => {
    const image = new Image()
    image.onload = () => {
      _splitCardImage(image)
    }
    image.src = './forpk/cards.png'
  }

  /** カード画像を分割する */
  const _splitCardImage = (image) => {
    const width = image.width / 13
    const height = image.height / 6
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    for (let i = 0; i < 6; i++) {
      const row = []
      for (let j = 0; j < 13; j++) {
        ctx.clearRect(0, 0, width, height)
        ctx.drawImage(image, width * j, height * i, width, height, 0, 0, width, height)
        row.push(canvas.toDataURL())
      }
      cardImages.push(row)
    }
  }

  /** カードと前後の文字との間に間隔が空くようにする */
  const _wrapTextNode = (text) => {
    const parent = document.createElement('div')
    parent.innerHTML = text
    // テキストノードをspanタグで囲む
    parent.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const node = document.createElement('span')
        node.innerText = child.textContent
        parent.replaceChild(node, child)
      }
    })
    // カードとカードが連結しないときに隙間を空ける
    parent.childNodes.forEach((child, index) => {
      if (index + 1 > parent.childNodes.length - 1) {
        return
      }
      const nextChild = parent.childNodes[index + 1]
      if (child.classList.contains('card') && !nextChild.classList.contains('card')) {
        child.classList.add("margin")
      }
      if (!child.classList.contains('card') && nextChild.classList.contains('card')) {
        child.classList.add("margin")
      }
    })
    return parent.innerHTML
  }

  /** カード画像を読み込む */
  _loadCardImage()

  /** カードっぽい表現をimgに置き換える */
  window.comment4pk = (comment, color) => {
    // 一度変換されていたら変換しない
    const replaced = comment.data.replaced || false
    if (replaced) {
      return comment
    }

    let text = comment.data.comment;
    let table = {};
    ([text, table] = _escapeBrcExp(text, table));
    ([text, table] = _escapeDnyExp(text, table));
    ([text, table] = _escapeImgExp(text, table, 0));
    ([text, table] = _escapeUrlExp(text, table));

    text = _replaceEnHdscExp(text, color);
    ([text, table] = _escapeImgExp(text, table, 1));
    text = _replaceEmHdscExp(text, color);
    ([text, table] = _escapeImgExp(text, table, 2));

    text = _revertEscExp(text, table)
    text = _wrapTextNode(text)
    comment.data.comment = text
    comment.data.replaced = true
    return comment
  }

  /** headタグの最後にsvgのスタイルを追加する */
  document.head.insertAdjacentHTML(
    'beforeend',
    `<link rel="stylesheet" href="./forpk/img.css" />`
  )
})()
