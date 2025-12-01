package com.qrventory.mobile

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.qrventory.mobile.databinding.ItemScanBinding

class ScannedItemAdapter(
    private val items: MutableList<ScannedItem> = mutableListOf()
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
        holder.binding.itemTitle.text = item.name.ifBlank { "Sin nombre" }
        holder.binding.itemSubtitle.text = item.serial.ifBlank { "Sin serie" }
        val category = item.category.ifBlank { "Sin categoria" }
        val location = item.location.ifBlank { "Sin ubicacion" }
        holder.binding.itemMeta.text = "$category • $location"
    }

    fun submitItems(newItems: List<ScannedItem>) {
        items.clear()
        items.addAll(newItems)
        notifyDataSetChanged()
    }
}
