import { v } from "convex/values"
import { internalMutation } from "./_generated/server"
import { normalizePaymentMethod } from "./payments"
import { makeUnits } from "./orderItemsFactory"

export const seedLeComptoir = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("restaurants").withIndex("by_slug", q => q.eq("slug", "le-comptoir-parisien")).unique()
    if (existing) return { restaurantId: existing._id, message: "Already seeded" }

    const restaurantId = await ctx.db.insert("restaurants", {
      name: "Le Comptoir Parisien",
      slug: "le-comptoir-parisien",
      address: "12 rue de Rivoli, 75004 Paris",
      phone: "01 42 33 44 55",
      email: "gerant@lecomptoir.fr",
      type: "restaurant",
    })

    // Create 14 tables
    const tableStatuses = [
      { n:1,  status:"dining"  as const, guests:2, durationMinutes:70,  amountCents:7800 },
      { n:2,  status:"free"    as const },
      { n:3,  status:"payment" as const, guests:3, durationMinutes:102, amountCents:10100, alert:true },
      { n:4,  status:"dining"  as const, guests:2, durationMinutes:45,  amountCents:5200 },
      { n:5,  status:"dining"  as const, guests:4, durationMinutes:32,  amountCents:3400 },
      { n:6,  status:"free"    as const },
      { n:7,  status:"paid"    as const, guests:2, durationMinutes:125, amountCents:6200 },
      { n:8,  status:"dining"  as const, guests:3, durationMinutes:58,  amountCents:8800 },
      { n:9,  status:"payment" as const, guests:4, durationMinutes:115, amountCents:7800, alert:true },
      { n:10, status:"free"    as const },
      { n:11, status:"dining"  as const, guests:2, durationMinutes:25,  amountCents:5600 },
      { n:12, status:"payment" as const, guests:3, durationMinutes:130, amountCents:5500, alert:true },
      { n:13, status:"paid"    as const, guests:5, durationMinutes:150, amountCents:14200 },
      { n:14, status:"free"    as const },
    ]

    for (const t of tableStatuses) {
      await ctx.db.insert("tables", {
        restaurantId,
        number: t.n,
        capacity: 4,
        status: t.status,
        guests: t.guests,
        durationMinutes: t.durationMinutes,
        amountCents: t.amountCents,
        alert: t.alert,
      })
    }

    // Seed sample feedbacks
    const tableRows = await ctx.db.query("tables").withIndex("by_restaurant", q => q.eq("restaurantId", restaurantId)).collect()
    const tableMap = Object.fromEntries(tableRows.map(t => [t.number, t._id]))

    const sampleFeedbacks = [
      { tableNumber:12, stars:2, tags:["⏱ Service lent","🥘 Plat froid"], text:"Service vraiment trop lent, mon plat était tiède à l'arrivée.", timeLabel:"hier 21h47", isNew:true },
      { tableNumber:4,  stars:3, tags:["💸 Erreur addition"], text:"Addition incorrecte, on a dû demander deux fois pour corriger.", timeLabel:"hier 20h12", isNew:true },
      { tableNumber:7,  stars:5, tags:["😊 Super ambiance","✨ On reviendra !"], text:"Accueil chaleureux, entrecôte parfaite, on reviendra !", timeLabel:"hier 22h15", isNew:false },
      { tableNumber:9,  stars:3, tags:["📢 Trop bruyant"], text:"Bon dîner, table un peu bruyante près de la cuisine.", timeLabel:"hier 19h44", isNew:false },
    ]

    for (const fb of sampleFeedbacks) {
      const tid = tableMap[fb.tableNumber]
      if (tid) {
        await ctx.db.insert("feedbacks", {
          restaurantId,
          tableId: tid,
          tableNumber: fb.tableNumber,
          stars: fb.stars,
          tags: fb.tags,
          text: fb.text,
          isNew: fb.isNew,
          createdAt: Date.now(),
          timeLabel: fb.timeLabel,
        })
      }
    }

    // Seed sample payments
    const samplePayments = [
      { tableNumber:7,  guests:2, subtotalCents:5700,  tipCents:570,  commissionCents:219, totalCents:6270,  paymentMethod:"card",     dateLabel:"11/05" },
      { tableNumber:13, guests:5, subtotalCents:12920, tipCents:1280, commissionCents:497, totalCents:14200, paymentMethod:"apple_pay", dateLabel:"11/05" },
      { tableNumber:2,  guests:2, subtotalCents:4380,  tipCents:440,  commissionCents:169, totalCents:4820,  paymentMethod:"card",     dateLabel:"10/05" },
      { tableNumber:5,  guests:4, subtotalCents:8140,  tipCents:810,  commissionCents:313, totalCents:8950,  paymentMethod:"card",     dateLabel:"10/05" },
      { tableNumber:11, guests:2, subtotalCents:3420,  tipCents:340,  commissionCents:132, totalCents:3760,  paymentMethod:"google_pay",dateLabel:"10/05" },
      { tableNumber:6,  guests:3, subtotalCents:6590,  tipCents:650,  commissionCents:253, totalCents:7240,  paymentMethod:"card",     dateLabel:"09/05" },
      { tableNumber:1,  guests:2, subtotalCents:4670,  tipCents:460,  commissionCents:180, totalCents:5130,  paymentMethod:"card",     dateLabel:"09/05" },
      { tableNumber:8,  guests:4, subtotalCents:8980,  tipCents:890,  commissionCents:345, totalCents:9870,  paymentMethod:"apple_pay", dateLabel:"08/05" },
    ]

    for (const p of samplePayments) {
      const tid = tableMap[p.tableNumber]
      if (tid) {
        await ctx.db.insert("payments", {
          restaurantId,
          tableId: tid,
          tableNumber: p.tableNumber,
          guests: p.guests,
          subtotalCents: p.subtotalCents,
          tipCents: p.tipCents,
          commissionCents: p.commissionCents,
          totalCents: p.totalCents,
          paymentMethod: normalizePaymentMethod(p.paymentMethod),
          status: "Encaissé",
          createdAt: Date.now(),
          dateLabel: p.dateLabel,
        })
      }
    }

    return { restaurantId, message: "Seeded successfully" }
  },
})

export const seedScenarioComplet = internalMutation({
  args: {},
  handler: async (ctx) => {
    const restaurant = await ctx.db
      .query("restaurants")
      .filter(q => q.eq(q.field("name"), "Snack Momo"))
      .first()
    if (!restaurant) throw new Error("Restaurant 'Snack Momo' introuvable")

    const tables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurant._id))
      .collect()
    if (!tables.length) throw new Error("Aucune table trouvée pour Snack Momo")

    const now = Date.now()
    const DAY = 86400000
    const methods = ["card", "card", "apple_pay", "google_pay"] as const

    const paymentRows: Array<{
      createdAt: number; tableNumber: number; guests: number
      subtotalCents: number; tipCents: number; totalCents: number
      paymentMethod: string; dateLabel: string
    }> = []

    for (let i = 0; i < 25; i++) {
      const offsetDays = Math.floor(Math.random() * 30)
      const createdAt = now - offsetDays * DAY
      const table = tables[i % tables.length]
      const subtotalCents = 2800 + Math.floor(Math.random() * (14500 - 2800 + 1))
      const tipCents = Math.round(subtotalCents * (0.06 + Math.random() * 0.06))
      const commissionCents = Math.round(subtotalCents * 0.015)
      const totalCents = subtotalCents + tipCents
      const guests = 2 + Math.floor(Math.random() * 5)
      const d = new Date(createdAt)
      const dateLabel = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
      await ctx.db.insert("payments", {
        restaurantId: restaurant._id,
        tableId: table._id,
        tableNumber: table.number,
        guests,
        subtotalCents,
        tipCents,
        commissionCents,
        totalCents,
        paymentMethod: methods[i % 4],
        status: "Encaissé",
        createdAt,
        dateLabel,
      })
      paymentRows.push({ createdAt, tableNumber: table.number, guests, subtotalCents, tipCents, totalCents, paymentMethod: methods[i % 4], dateLabel })
    }

    const templates = [
      { stars: 5, tags: ["😊 Super ambiance", "✨ On reviendra !"],  text: "Super rapport qualité-prix, les momos sont délicieux !" },
      { stars: 5, tags: ["😋 Délicieux", "⚡ Service rapide"],        text: "Les momos au porc sont à tomber. Service ultra rapide." },
      { stars: 5, tags: ["😊 Super ambiance", "🍜 Carte alléchante"], text: "Endroit chaleureux, on s'y sent bien. Les bouillons sont excellents." },
      { stars: 5, tags: ["✨ On reviendra !"],                         text: "On est revenus deux fois cette semaine tellement c'est bon !" },
      { stars: 5, tags: ["😋 Délicieux", "✨ On reviendra !"],         text: "Meilleur snack du quartier. Les momos frits sont incroyables." },
      { stars: 5, tags: ["😊 Super ambiance", "⚡ Service rapide"],    text: "Accueil parfait, cuisine généreuse, prix doux." },
      { stars: 5, tags: ["😋 Délicieux"],                              text: "Portions généreuses, saveurs authentiques. Je recommande à tous mes amis." },
      { stars: 5, tags: ["✨ On reviendra !", "😊 Super ambiance"],    text: "Vraiment top, l'atmosphère est sympa et la nourriture délicieuse." },
      { stars: 5, tags: ["😋 Délicieux", "🍜 Carte alléchante"],       text: "Une pépite cachée. Les momos vapeur fondent en bouche." },
      { stars: 5, tags: ["😊 Super ambiance"],                         text: "Super expérience dès la première visite. Personnel adorable." },
      { stars: 4, tags: ["😊 Super ambiance"],   text: "Très bon dans l'ensemble, juste un peu d'attente à l'entrée." },
      { stars: 4, tags: ["😋 Délicieux"],         text: "Bonne cuisine, service efficace. Reviendrai." },
      { stars: 4, tags: ["✨ On reviendra !"],    text: "Momos excellents, légèrement moins chauds qu'espéré mais sinon parfait." },
      { stars: 4, tags: ["⚡ Service rapide"],    text: "Rapide et savoureux. Juste les desserts un peu limités." },
      { stars: 4, tags: ["😊 Super ambiance"],   text: "Bonne ambiance, cuisine solide. On prend plaisir à y revenir." },
      { stars: 3, tags: ["📢 Trop bruyant"],                     text: "Bruyant aux heures de pointe, mais les momos valent le déplacement." },
      { stars: 3, tags: ["⏱ Service lent"],                      text: "Attente un peu longue pour deux commandes simples." },
      { stars: 3, tags: ["📢 Trop bruyant", "⏱ Service lent"],   text: "Savoureux mais service inégal selon les jours." },
      { stars: 3, tags: ["💸 Erreur addition"],                   text: "Addition à vérifier, une boisson en trop sur notre commande." },
      { stars: 2, tags: ["⏱ Service lent", "🥘 Plat froid"],     text: "Momos arrivés froids, commande oubliée pendant 20 minutes." },
      { stars: 2, tags: ["🥘 Plat froid"],                         text: "Plat tiède, dommage pour la qualité habituelle." },
      { stars: 2, tags: ["⏱ Service lent", "💸 Erreur addition"], text: "Service désorganisé ce soir-là, addition incorrecte." },
      { stars: 2, tags: ["📢 Trop bruyant"],                       text: "Trop bruyant pour avoir une conversation, difficile de profiter." },
      { stars: 1, tags: ["🥘 Plat froid", "⏱ Service lent"],       text: "Commande perdue, long délai d'attente, plat froid à l'arrivée. Très déçu." },
      { stars: 1, tags: ["💸 Erreur addition", "⏱ Service lent"],  text: "Mauvaise expérience : addition erronée et serveur peu aimable." },
    ]

    const feedbackRows: Array<{
      createdAt: number; tableNumber: number; stars: number
      tags: string[]; text: string; timeLabel: string
    }> = []

    for (let i = 0; i < templates.length; i++) {
      const tmpl = templates[i]
      const offsetDays = Math.floor(Math.random() * 14)
      const createdAt = now - offsetDays * DAY
      const table = tables[i % tables.length]
      const timeLabel = offsetDays === 0 ? "aujourd'hui" : offsetDays === 1 ? "hier" : `il y a ${offsetDays} jours`
      await ctx.db.insert("feedbacks", {
        restaurantId: restaurant._id,
        tableId: table._id,
        tableNumber: table.number,
        stars: tmpl.stars,
        tags: tmpl.tags,
        text: tmpl.text,
        isNew: offsetDays <= 7,
        createdAt,
        timeLabel,
      })
      feedbackRows.push({ createdAt, tableNumber: table.number, stars: tmpl.stars, tags: tmpl.tags, text: tmpl.text, timeLabel })
    }

    return {
      restaurantName: restaurant.name,
      payments: paymentRows,
      feedbacks: feedbackRows,
    }
  },
})

export const clearSnackMomoFull = internalMutation({
  args: {},
  handler: async (ctx) => {
    const restaurant = await ctx.db
      .query("restaurants")
      .filter(q => q.eq(q.field("name"), "Snack Momo"))
      .first()
    if (!restaurant) throw new Error("Restaurant 'Snack Momo' introuvable")

    const fbs = await ctx.db
      .query("feedbacks")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurant._id))
      .collect()
    for (const fb of fbs) await ctx.db.delete(fb._id)

    const pmts = await ctx.db
      .query("payments")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurant._id))
      .collect()
    for (const p of pmts) await ctx.db.delete(p._id)

    return { message: `Snack Momo nettoyé : ${fbs.length} feedbacks, ${pmts.length} paiements supprimés` }
  },
})

export const simulateClient = internalMutation({
  args: {},
  handler: async (ctx) => {
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_slug", q => q.eq("slug", "le-comptoir-parisien"))
      .unique()
    if (!restaurant) throw new Error("Restaurant not found — run seedLeComptoir first")

    // Pick table 2 (free)
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurant._id))
      .collect()
    const table = tables.find(t => t.number === 2)
    if (!table) throw new Error("Table 2 not found")

    const now = Date.now()
    const d = new Date(now)
    const hhmm = `${String(d.getHours()).padStart(2,'0')}h${String(d.getMinutes()).padStart(2,'0')}`
    const dateLabel = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`

    // 1. Client arrives — table goes dining
    await ctx.db.patch(table._id, {
      status: "dining",
      guests: 2,
      durationMinutes: 0,
      amountCents: 7400,
      alert: false,
    })

    // 2. Payment — Yann paie Entrecôte + Verre Bordeaux + Café
    //    Sous-total: 24€ + 11€ + 3€ = 38€, pourboire 10% = 3,80€, commission 1,5% = 0,57€
    const subtotal  = 3800
    const tip       = 380
    const commission = Math.round(subtotal * 0.015)
    const total     = subtotal + tip

    await ctx.db.insert("payments", {
      restaurantId: restaurant._id,
      tableId: table._id,
      tableNumber: 2,
      guests: 2,
      subtotalCents: subtotal,
      tipCents: tip,
      commissionCents: commission,
      totalCents: total,
      paymentMethod: "card",
      status: "Encaissé",
      createdAt: now,
      dateLabel,
    })

    // 3. Table passes to paid
    await ctx.db.patch(table._id, { status: "paid", amountCents: total })

    // 4. Feedback — 4 étoiles, bonne expérience
    await ctx.db.insert("feedbacks", {
      restaurantId: restaurant._id,
      tableId: table._id,
      tableNumber: 2,
      stars: 4,
      tags: ["😊 Super ambiance", "🍷 Carte des vins"],
      text: "Très bon repas, entrecôte parfaitement cuite. Service attentionné. La carte des vins est excellente, on reviendra !",
      isNew: true,
      createdAt: now,
      timeLabel: `aujourd'hui ${hhmm}`,
    })

    return {
      message: `✅ Client simulé sur Table 2 — paiement ${(total/100).toFixed(2).replace('.',',')}€ enregistré, feedback 4★ envoyé`,
      tableId: table._id,
      totalCents: total,
    }
  },
})

// Scénario de vérification "audit anti-mock" : monte sur un restaurant donné
// l'ensemble des états réels à contrôler visuellement (table occupée avec
// commande, paiement partiel avec pourboire, table réglée, table en repas
// sans commande caisse, tables libres) + paiements J et J-1 + feedbacks.
// internalMutation uniquement — jamais exposable côté client.
export const seedAuditScenario = internalMutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const restaurant = await ctx.db
      .query("restaurants")
      .withIndex("by_slug", q => q.eq("slug", slug))
      .first()
    if (!restaurant) throw new Error(`Restaurant '${slug}' introuvable`)

    const tables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant", q => q.eq("restaurantId", restaurant._id))
      .collect()
    const byNum = (n: number) => tables.find(t => t.number === n)
    const t1 = byNum(1), t2 = byNum(2), t3 = byNum(3), t4 = byNum(4)
    if (!t1 || !t2 || !t3 || !t4) throw new Error("Tables 1-4 requises")

    const now = Date.now()
    const d = new Date(now)
    const hhmm = `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`
    const dl = (ts: number) => {
      const x = new Date(ts)
      return `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}`
    }

    // T1 — en repas, commande caisse complète
    await ctx.db.patch(t1._id, {
      status: "dining", guests: 4, durationMinutes: 35,
      amountCents: 8600, paidCents: 0, paidTipCents: 0,
      // GOAL_PAIEMENTS_01 : unités créées par la fabrique (lineId, paidCents 0).
      orderItems: makeUnits([
        { name: "Burger maison", qty: 2, unitCents: 1600 },
        { name: "Salade César", qty: 1, unitCents: 1400 },
        { name: "Limonade", qty: 4, unitCents: 400 },
        { name: "Tiramisu", qty: 2, unitCents: 1100 },
      ]),
      alert: false,
    })

    // T2 — paiement partiel avec pourboire (2 convives sur 3 ont payé)
    await ctx.db.patch(t2._id, {
      status: "payment", guests: 3, durationMinutes: 78,
      amountCents: 6300, paidCents: 4200, paidTipCents: 420,
      // Scénario mi-sitting : les unités déjà réglées portent paid + paidCents,
      // posés APRÈS la fabrique (une unité naît toujours libre et non payée).
      orderItems: [
        ...makeUnits([
          { name: "Pizza margherita", qty: 2, unitCents: 1300 },
          { name: "Pâtes truffe", qty: 1, unitCents: 1600 },
        ]).map(u => ({ ...u, paid: true, paidCents: u.unitCents })),
        ...makeUnits([{ name: "Vin rouge (verre)", qty: 3, unitCents: 700 }]),
      ],
      alert: false,
    })
    await ctx.db.insert("payments", {
      restaurantId: restaurant._id, tableId: t2._id, tableNumber: 2,
      guests: 2, subtotalCents: 4200, tipCents: 420,
      commissionCents: Math.round(4200 * 0.015), totalCents: 4620,
      paymentMethod: "card", status: "Encaissé", createdAt: now - 600000, dateLabel: dl(now),
    })

    // T3 — réglée intégralement
    await ctx.db.patch(t3._id, {
      status: "paid", guests: 2, durationMinutes: 95,
      amountCents: 5400, paidCents: 5400, paidTipCents: 540,
      alert: false,
    })
    await ctx.db.insert("payments", {
      restaurantId: restaurant._id, tableId: t3._id, tableNumber: 3,
      guests: 2, subtotalCents: 5400, tipCents: 540,
      commissionCents: Math.round(5400 * 0.015), totalCents: 5940,
      paymentMethod: "card", status: "Encaissé", createdAt: now - 1800000, dateLabel: dl(now),
    })

    // T4 — en repas SANS commande caisse (cas "données absentes")
    await ctx.db.patch(t4._id, {
      status: "dining", guests: 0, durationMinutes: 0,
      amountCents: 0, paidCents: 0, paidTipCents: 0,
      orderItems: [], alert: false,
    })

    // Paiement d'HIER pour la comparaison "vs hier" de la Vue d'ensemble
    await ctx.db.insert("payments", {
      restaurantId: restaurant._id, tableId: t3._id, tableNumber: 3,
      guests: 3, subtotalCents: 7800, tipCents: 700,
      commissionCents: Math.round(7800 * 0.015), totalCents: 8500,
      paymentMethod: "card", status: "Encaissé", createdAt: now - 86400000, dateLabel: dl(now - 86400000),
    })

    // Feedbacks réels (un positif, un négatif)
    await ctx.db.insert("feedbacks", {
      restaurantId: restaurant._id, tableId: t3._id, tableNumber: 3,
      stars: 5, tags: ["😊 Super ambiance"],
      text: "Très bon moment, paiement super simple.",
      isNew: true, createdAt: now - 1700000, timeLabel: `aujourd'hui ${hhmm}`,
    })
    await ctx.db.insert("feedbacks", {
      restaurantId: restaurant._id, tableId: t2._id, tableNumber: 2,
      stars: 2, tags: ["⏱ Service lent"],
      text: "Attente trop longue entre les plats.",
      isNew: true, createdAt: now - 1600000, timeLabel: `aujourd'hui ${hhmm}`,
    })

    return { message: "✅ Scénario audit monté", restaurantId: restaurant._id }
  },
})

// Purge ciblée de données de test : suppression par _id explicite,
// uniquement via CLI/dashboard (internalMutation).
export const purgeTestRows = internalMutation({
  args: {
    paymentIds: v.array(v.id("payments")),
    feedbackIds: v.array(v.id("feedbacks")),
  },
  handler: async (ctx, { paymentIds, feedbackIds }) => {
    for (const id of paymentIds) await ctx.db.delete(id)
    for (const id of feedbackIds) await ctx.db.delete(id)
    return { payments: paymentIds.length, feedbacks: feedbackIds.length }
  },
})
