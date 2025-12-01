package com.qrventory.mobile

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.qrventory.mobile.databinding.ItemScanBinding

class ScannedItemAdapter(
    private val items: MutableList<ScannedItem> = mutableListOf(),
    private val onItemClick: (ScannedItem) -> Unit = {},
    private val onDeleteClick: (ScannedItem) -> Unit = {}
) : RecyclerView.Adapter<ScannedItemAdapter.ViewHolder>() {

    class ViewHolder(val binding: ItemScanBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        val binding = ItemScanBinding.inflate(inflater, parent, false)
        return ViewHolder(binding)
    }

    override fun getItemCount(): Int = items.size

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = items[position]
        val context = holder.binding.root.context

        holder.binding.itemTitle.text = item.name.ifBlank { context.getString(R.string.item_name_placeholder) }
        holder.binding.itemSubtitle.text = item.serial.ifBlank { context.getString(R.string.item_serial_placeholder) }
        val category = item.category.ifBlank { context.getString(R.string.item_category_placeholder) }
        val location = item.location.ifBlank { context.getString(R.string.item_location_placeholder) }
        holder.binding.itemMeta.text = context.getString(R.string.item_meta_format, category, location)

        holder.binding.root.setOnClickListener { onItemClick(item) }
        holder.binding.deleteButton.setOnClickListener { onDeleteClick(item) }
    }

    fun submitItems(newItems: List<ScannedItem>) {
        items.clear()
        items.addAll(newItems)
        notifyDataSetChanged()
    }
}
