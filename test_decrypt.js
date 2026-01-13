const h = "1242898";
const y = (e => {
    let t = e => e.split("").map(e => e.charCodeAt(0));
    return e.split("").map(t).map(e => t("8c465aa8af6cbfd4c1f91bf0c8d678ba").reduce((e, t) => e ^ t, e)).map(e => ("0" + Number(e).toString(16)).substr(-2)).join("")
})(h + "d486ae1ce6fdbe63b60bd1704541fcf0");
console.log("Decrypted key (y):", y);
