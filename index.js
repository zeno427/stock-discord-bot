import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from "discord.js";
import fs from "fs";

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error("❌ DISCORD_TOKEN not set");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const DATA_FILE = "./products.json";

const loadProducts = () => JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
const saveProducts = (data) =>
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

const commands = [
  new SlashCommandBuilder()
    .setName("add_product")
    .setDescription("Add a product")
    .addStringOption(o => o.setName("name").setDescription("Name").setRequired(true))
    .addNumberOption(o => o.setName("price").setDescription("Price").setRequired(true))
    .addStringOption(o => o.setName("description").setDescription("Description").setRequired(true)),

  new SlashCommandBuilder()
    .setName("edit_product")
    .setDescription("Edit a product by ID")
    .addIntegerOption(o => o.setName("id").setDescription("Product ID").setRequired(true))
    .addStringOption(o => o.setName("name").setDescription("Name").setRequired(true))
    .addNumberOption(o => o.setName("price").setDescription("Price").setRequired(true))
    .addStringOption(o => o.setName("description").setDescription("Description").setRequired(true)),

  new SlashCommandBuilder()
    .setName("remove_product")
    .setDescription("Remove a product by ID")
    .addIntegerOption(o => o.setName("id").setDescription("Product ID").setRequired(true)),

  new SlashCommandBuilder()
    .setName("list_products")
    .setDescription("List all products"),

  new SlashCommandBuilder()
    .setName("stock")
    .setDescription("Show stock")
];

client.once("ready", async () => {
  const rest = new REST({ version: "10" }).setToken(TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), {
    body: commands.map(c => c.toJSON())
  });
  console.log(`✅ Bot online as ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (interaction.isChatInputCommand()) {
    let products = loadProducts();

    if (interaction.commandName === "add_product") {
      const id = products.length ? products.at(-1).id + 1 : 1;
      products.push({
        id,
        name: interaction.options.getString("name"),
        price: interaction.options.getNumber("price"),
        description: interaction.options.getString("description")
      });
      saveProducts(products);
      return interaction.reply(`✅ Product added (ID ${id})`);
    }

    if (interaction.commandName === "edit_product") {
      const id = interaction.options.getInteger("id");
      const p = products.find(x => x.id === id);
      if (!p) return interaction.reply("❌ ID not found");

      p.name = interaction.options.getString("name");
      p.price = interaction.options.getNumber("price");
      p.description = interaction.options.getString("description");
      saveProducts(products);
      return interaction.reply(`✅ Product ${id} updated`);
    }

    if (interaction.commandName === "remove_product") {
      const id = interaction.options.getInteger("id");
      saveProducts(products.filter(p => p.id !== id));
      return interaction.reply(`🗑️ Product ${id} removed`);
    }

    if (interaction.commandName === "list_products") {
      if (!products.length) return interaction.reply("No products.");
      return interaction.reply(
        products.map(p => `ID ${p.id} | ${p.name} | ${p.price}`).join("\n")
      );
    }

    if (interaction.commandName === "stock") {
      const rows = [];
      let row = new ActionRowBuilder();

      products.forEach((p, i) => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`prod_${p.id}`)
            .setLabel(p.name)
            .setStyle(ButtonStyle.Primary)
        );
        if ((i + 1) % 5 === 0) {
          rows.push(row);
          row = new ActionRowBuilder();
        }
      });
      rows.push(row);

      return interaction.reply({
        content: "**STOCK**\nSelect a product:",
        components: rows
      });
    }
  }

  if (interaction.isButton()) {
    const id = Number(interaction.customId.split("_")[1]);
    const p = loadProducts().find(x => x.id === id);
    if (!p) return;

    const embed = new EmbedBuilder()
      .setTitle(p.name)
      .addFields(
        { name: "ID", value: String(p.id), inline: true },
        { name: "Price", value: String(p.price), inline: true },
        { name: "Description", value: p.description }
      );

    interaction.reply({ embeds: [embed], ephemeral: true });
  }
});

client.login(TOKEN);
