/*
* Vieb - Vim Inspired Electron Browser
* Copyright (C) 2019-2022 Jelmer van Arnhem
*
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
*
* You should have received a copy of the GNU General Public License
* along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
"use strict"

const {ipcRenderer} = require("electron")
const {
    activeElement,
    writeFile,
    querySelectorAll,
    findFrameInfo,
    findElementAtPosition,
    fetchJSON,
    matchesQuery
} = require("../util")

const nextPage = newtab => navigateToPage("*[rel=next], .navi-next", newtab)

const previousPage = newtab => navigateToPage("*[rel=prev], .navi-prev", newtab)

const navigateToPage = (selector, newtab) => {
    const paginations = querySelectorAll(selector)
    for (const pagination of paginations) {
        if (pagination?.href) {
            if (newtab) {
                ipcRenderer.sendToHost("url", pagination.href)
            } else {
                window.location = pagination.href
            }
            return
        }
    }
}

const blur = () => activeElement()?.blur?.()

const scrollBy = (x, y) => {
    if (window.innerHeight === document.documentElement.scrollHeight) {
        document.body.scrollBy(x, y)
    } else {
        window.scrollBy(x, y)
    }
}

const scrollPerc = perc => {
    if (document.documentElement.scrollHeight === window.innerHeight) {
        const scrollHeightMinusScreen = document.body.scrollHeight
            - window.innerHeight
        document.body.scrollTo(0, scrollHeightMinusScreen * perc / 100)
    } else {
        const scrollHeightMinusScreen = document.documentElement.scrollHeight
            - window.innerHeight
        window.scrollTo(0, scrollHeightMinusScreen * perc / 100)
    }
}

const scrollTop = () => scrollBy(0, -window.innerHeight - 1000000000)

const scrollLeft = () => scrollBy(-100, 0)

const scrollDown = () => scrollBy(0, 100)

const scrollUp = () => scrollBy(0, -100)

const scrollRight = () => scrollBy(100, 0)

const scrollBottom = () => scrollBy(0, window.innerHeight + 1000000000)

const scrollLeftMax = () => scrollBy(-window.innerWidth - 1000000000, 0)

const scrollRightMax = () => scrollBy(window.innerWidth + 1000000000, 0)

const scrollPageRight = () => scrollBy(window.innerWidth - 50, 0)

const scrollPageLeft = () => scrollBy(-window.innerWidth + 50, 0)

const scrollPageUp = () => scrollBy(0, -window.innerHeight + 50)

const scrollPageDownHalf = () => scrollBy(0, window.innerHeight / 2 - 25)

const scrollPageDown = () => scrollBy(0, window.innerHeight - 50)

const scrollPageUpHalf = () => scrollBy(0, -window.innerHeight / 2 + 25)

const focusTopLeftCorner = () => document.elementFromPoint(0, 0).focus()

const exitFullscreen = () => document.exitFullscreen()

const writeableInputs = {}

const setInputFieldText = (filename, text) => {
    const el = writeableInputs[filename]
    if (["input", "textarea"].includes(el.tagName.toLowerCase())) {
        el.value = text
    } else if (el.getAttribute("contenteditable") === "true") {
        el.textContent = text
    }
}

const writeInputToFile = filename => {
    const el = activeElement()
    if (el) {
        if (["input", "textarea"].includes(el.tagName.toLowerCase())) {
            writeFile(filename, el.value)
        } else if (el.getAttribute("contenteditable") === "true") {
            writeFile(filename, el.textContent)
        }
        writeableInputs[filename] = el
    }
}

const print = () => document.execCommand("print")

const toggleControls = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (matchesQuery(el, "video")) {
        if (["", "controls", "true"].includes(el.getAttribute("controls"))) {
            el.removeAttribute("controls")
        } else {
            el.setAttribute("controls", "controls")
        }
    }
}

const toggleLoop = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (matchesQuery(el, "audio, video")) {
        if (["", "loop", "true"].includes(el.getAttribute("loop"))) {
            el.removeAttribute("loop")
        } else {
            el.setAttribute("loop", "loop")
        }
    }
}

const toggleMute = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (matchesQuery(el, "audio, video")) {
        if (el.volume === 0) {
            el.volume = 1
        } else {
            el.volume = 0
        }
    }
}

const togglePause = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (matchesQuery(el, "audio, video")) {
        if (el.paused) {
            el.play()
        } else {
            el.pause()
        }
    }
}

const volumeDown = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (matchesQuery(el, "audio, video")) {
        el.volume = Math.max(0, el.volume - 0.1) || 0
    }
}

const volumeUp = (x, y) => {
    const el = findElementAtPosition(x, y)
    if (matchesQuery(el, "audio, video")) {
        el.volume = Math.min(1, el.volume + 0.1) || 1
    }
}

const documentAtPos = (x, y) => findElementAtPosition(x, y)
    ?.ownerDocument || document

const isTextNode = node => [
    Node.TEXT_NODE, Node.COMMENT_NODE, Node.CDATA_SECTION_NODE
].includes(node.nodeType)

const calculateOffset = (startNode, startX, startY, x, y) => {
    const range = (findElementAtPosition(startX, startY)
        ?.ownerDocument || document).createRange()
    range.setStart(startNode, 0)
    try {
        range.setEnd(startNode, 1)
    } catch {
        return {"node": startNode, "offset": 0}
    }
    let properNode = startNode
    let offset = 0
    const descendNodeTree = baseNode => {
        const pointInsideRegion = (start, end) => {
            range.setStart(baseNode, start)
            range.setEnd(baseNode, end)
            return [...range.getClientRects()].find(rect => x >= rect.left
                && y >= rect.top && x <= rect.right && y <= rect.bottom)
        }
        let left = 0
        let right = 0
        if (isTextNode(baseNode)) {
            right = baseNode.length
        } else {
            right = baseNode.childNodes.length
        }
        if (right === 0) {
            return
        }
        while (right - left > 1) {
            const center = left + Math.floor((right - left) / 2)
            if (pointInsideRegion(left, center)) {
                right = center
            } else if (pointInsideRegion(center, right)) {
                left = center
            } else {
                break
            }
        }
        if (isTextNode(baseNode)) {
            properNode = baseNode
            offset = left
            return
        }
        descendNodeTree(baseNode.childNodes[left])
    }
    descendNodeTree(startNode)
    range.detach()
    return {"node": properNode, offset}
}

const selectionAll = (x, y) => documentAtPos(x, y).execCommand("selectAll")
const selectionCut = (x, y) => documentAtPos(x, y).execCommand("cut")
const selectionPaste = (x, y) => documentAtPos(x, y).execCommand("paste")
const selectionRemove = (x, y) => documentAtPos(x, y).getSelection()
    .removeAllRanges()
const selectionRequest = (startX, startY, endX, endY) => {
    querySelectorAll("*")
    let startNode = findElementAtPosition(startX, startY)
    if (!startNode || startY < 0 || startY > window.innerHeight) {
        startNode = document.body
    }
    const selectDocument = startNode?.ownerDocument || document
    const padding = findFrameInfo(startNode)
    const startResult = calculateOffset(startNode, startX, startY,
        startX - (padding?.x || 0), startY - (padding?.y || 0))
    const endNode = findElementAtPosition(endX, endY)
    const endResult = calculateOffset(endNode, startX, startY,
        endX - (padding?.x || 0), endY - (padding?.y || 0))
    const newSelectRange = selectDocument.createRange()
    newSelectRange.setStart(startResult.node, startResult.offset)
    if (isTextNode(endResult.node) && endResult.node.length > 1) {
        newSelectRange.setEnd(endResult.node, endResult.offset + 1)
    } else {
        newSelectRange.setEnd(endResult.node, endResult.offset)
    }
    selectDocument.getSelection().removeAllRanges()
    selectDocument.getSelection().addRange(newSelectRange)
    if (!selectDocument.getSelection().toString()) {
        newSelectRange.setStart(endResult.node, endResult.offset)
        if (isTextNode(endResult.node) && endResult.node.length > 1) {
            newSelectRange.setEnd(startResult.node, startResult.offset + 1)
        } else {
            newSelectRange.setEnd(startResult.node, startResult.offset)
        }
        selectDocument.getSelection().removeAllRanges()
        selectDocument.getSelection().addRange(newSelectRange)
    }
}

const translatepage = async(api, url, lang, apiKey) => {
    [...document.querySelectorAll("rt")].forEach(r => r.remove())
    ;[...document.querySelectorAll("ruby")].forEach(r => r.parentNode
        .replaceChild(document.createTextNode(r.textContent), r))
    const tree = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let textNodes = []
    let {currentNode} = tree
    while (currentNode) {
        textNodes.push(currentNode)
        currentNode = tree.nextNode()
    }
    textNodes = textNodes.filter(n => n.nodeValue?.length > 5)
    let baseNodes = []
    textNodes.forEach(n => {
        let base = n.parentNode ?? n
        if (n.childNodes.length === 1
            && n.childNodes[0].nodeName === "#text" && n.parentNode) {
            base = n.parentNode
        }
        if (["kbd", "style", "script"].includes(base.nodeName.toLowerCase())) {
            return
        }
        if (baseNodes.includes(base) || base === document.body) {
            return
        }
        baseNodes.push(base)
    })
    const parsedNodes = baseNodes.map(base => {
        const txtEl = document.createElement("p")
        for (const textNode of base.childNodes) {
            const subText = document.createElement("p")
            if (["kbd", "code"].includes(textNode.nodeName.toLowerCase())) {
                // Skip element text
            } else if (textNode.textContent === textNode.innerHTML) {
                subText.textContent = textNode.textContent
            } else if (textNode.nodeName === "#text") {
                subText.textContent = textNode.textContent
            }
            txtEl.appendChild(subText)
        }
        if (txtEl.textContent.trim()) {
            return txtEl
        }
        baseNodes = baseNodes.filter(b => b !== base)
        return null
    }).filter(el => el)
    const strings = parsedNodes.map(n => n.innerHTML)
    if (api === "libretranslate") {
        try {
            const srcResponse = await fetchJSON(`${url}/detect`, {
                "headers": {"Content-Type": "application/json"},
                "method": "POST"
            }, JSON.stringify({
                "api_key": apiKey,
                "q": strings
            }))
            if (srcResponse.error) {
                return ipcRenderer.sendToHost("notify",
                    `Error from LibreTranslate: ${srcResponse.error}`, "err")
            }
            const response = await fetchJSON(`${url}/translate`, {
                "headers": {"Content-Type": "application/json"},
                "method": "POST"
            }, JSON.stringify({
                "api_key": apiKey,
                "format": "html",
                "q": strings,
                "source": srcResponse[0]?.language,
                "target": lang
            }))
            if (response.error) {
                return ipcRenderer.sendToHost("notify",
                    `Error from LibreTranslate: ${response.error}`, "err")
            }
            if (response.translatedText) {
                baseNodes.forEach((node, index) => {
                    const text = response.translatedText[index]
                    if (!text) {
                        return
                    }
                    const resEl = document.createElement("div")
                    resEl.innerHTML = text
                    ;[...node.childNodes].forEach((txtEl, txtIndex) => {
                        const txt = resEl.childNodes[txtIndex]?.textContent
                        if (txt) {
                            txtEl.textContent = txt
                        }
                    })
                })
            }
        } catch (e) {
            ipcRenderer.sendToHost("notify",
                "Failed to connect to LibreTranslate, see console", "err")
            console.warn(e)
        }
        return
    }
    try {
        const response = await fetchJSON(`${url}/translate`, {
            "headers": {
                "Authorization": `DeepL-Auth-Key ${apiKey}`,
                "Content-Type": "application/json"
            },
            "method": "POST"
        }, JSON.stringify({
            "split_sentences": "nonewlines",
            "tag_handling": "html",
            "target_lang": lang,
            "text": strings
        }))
        if (response.message) {
            return ipcRenderer.sendToHost("notify",
                `Error from Deepl: ${response.message}`, "err")
        }
        if (response.translations) {
            baseNodes.forEach((node, index) => {
                const text = response.translations[index]?.text
                if (!text) {
                    return
                }
                const resEl = document.createElement("div")
                resEl.innerHTML = text
                ;[...node.childNodes].forEach((txtEl, txtIndex) => {
                    const txt = resEl.childNodes[txtIndex]?.textContent
                    if (txt) {
                        txtEl.textContent = txt
                    }
                })
            })
        }
    } catch (e) {
        ipcRenderer.sendToHost("notify",
            "Failed to connect to Deepl for translation, see console", "err")
        console.warn(e)
    }
}

const functions = {
    blur,
    exitFullscreen,
    focusTopLeftCorner,
    nextPage,
    previousPage,
    print,
    scrollBottom,
    scrollDown,
    scrollLeft,
    scrollLeftMax,
    scrollPageDown,
    scrollPageDownHalf,
    scrollPageLeft,
    scrollPageRight,
    scrollPageUp,
    scrollPageUpHalf,
    scrollPerc,
    scrollRight,
    scrollRightMax,
    scrollTop,
    scrollUp,
    selectionAll,
    selectionCut,
    selectionPaste,
    selectionRemove,
    selectionRequest,
    setInputFieldText,
    toggleControls,
    toggleLoop,
    toggleMute,
    togglePause,
    translatepage,
    volumeDown,
    volumeUp,
    writeInputToFile
}

ipcRenderer.on("action", (_, name, ...args) => functions[name]?.(...args))

window.addEventListener("DOMContentLoaded", () => {
    ipcRenderer.on("set-custom-styling", (_, fontsize, customCSS) => {
        document.body.style.fontSize = `${fontsize}px`
        if (!document.getElementById("custom-styling")) {
            const styleElement = document.createElement("style")
            styleElement.id = "custom-styling"
            document.head.appendChild(styleElement)
        }
        document.getElementById("custom-styling").textContent = customCSS
        document.body.style.opacity = 1
    })
})
