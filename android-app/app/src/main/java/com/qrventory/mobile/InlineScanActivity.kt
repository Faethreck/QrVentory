package com.qrventory.mobile

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.zxing.BarcodeFormat
import com.google.zxing.client.android.BeepManager
import com.google.zxing.client.android.Intents
import com.journeyapps.barcodescanner.BarcodeCallback
import com.journeyapps.barcodescanner.BarcodeResult
import com.journeyapps.barcodescanner.DefaultDecoderFactory
import com.qrventory.mobile.databinding.ActivityScanBinding
import com.qrventory.mobile.databinding.DialogScanConfirmBinding

class InlineScanActivity : ComponentActivity() {

    private lateinit var binding: ActivityScanBinding
    private lateinit var beepManager: BeepManager
    private var finished = false
    private var confirmSheet: BottomSheetDialog? = null
    private var lastDetected: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityScanBinding.inflate(layoutInflater)
        setContentView(binding.root)

        beepManager = BeepManager(this)
        binding.scanPrompt.text = intent.getStringExtra(Intents.Scan.PROMPT_MESSAGE)
            ?: getString(R.string.scan_prompt)

        if (hasCameraPermission()) {
            startScanning()
        } else {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.CAMERA),
                CAMERA_PERMISSION_REQUEST
            )
        }
    }

    private fun startScanning() {
        binding.barcodeView.resume()
        binding.barcodeView.barcodeView.decoderFactory =
            DefaultDecoderFactory(listOf(BarcodeFormat.QR_CODE))
        binding.barcodeView.decodeContinuous(object : BarcodeCallback {
            override fun barcodeResult(result: BarcodeResult?) {
                result ?: return
                if (finished) return
                val text = result.text.orEmpty()
                if (text.isBlank()) return
                if (confirmSheet?.isShowing == true && text == lastDetected) return
                lastDetected = text
                beepManager.playBeepSoundAndVibrate()
                showDetectionAnimation()
                showPreview(text)
                binding.barcodeView.pause()
                showConfirmSheet(text)
            }
        })
    }

    private fun showPreview(contents: String) {
        val parsed = ItemParser.parse(contents)
        val serial = parsed.serial.ifBlank { getString(R.string.item_serial_placeholder) }
        val category = parsed.category.ifBlank { getString(R.string.item_category_placeholder) }
        val location = parsed.location.ifBlank { getString(R.string.item_location_placeholder) }

        binding.infoTitle.text = parsed.name.ifBlank { getString(R.string.item_name_placeholder) }
        binding.infoSerial.text = getString(R.string.scan_info_serial_label, serial)
        binding.infoMeta.text = getString(R.string.item_meta_format, category, location)
    }

    private fun showConfirmSheet(contents: String) {
        val dialog = BottomSheetDialog(this)
        val sheet = DialogScanConfirmBinding.inflate(layoutInflater)

        val parsed = ItemParser.parse(contents)
        sheet.nameValue.text = parsed.name.ifBlank { getString(R.string.item_name_placeholder) }
        sheet.serialValue.text = getString(R.string.label_serial) + ": " +
            parsed.serial.ifBlank { getString(R.string.item_serial_placeholder) }
        sheet.locationValue.text = getString(R.string.label_location) + ": " +
            parsed.location.ifBlank { getString(R.string.item_location_placeholder) }
        sheet.categoryValue.text = getString(R.string.label_category) + ": " +
            parsed.category.ifBlank { getString(R.string.item_category_placeholder) }
        sheet.providerValue.text = getString(R.string.label_provider) + ": " +
            parsed.provider.ifBlank { getString(R.string.extra_empty_value) }
        val dateText = parsed.dateAdded.ifBlank { getString(R.string.extra_empty_value) }
        sheet.dateAddedValue.text = getString(R.string.label_date_added) + ": " + dateText

        sheet.confirmButton.setOnClickListener {
            finished = true
            dialog.dismiss()
            deliverResult(contents)
        }
        sheet.keepScanningButton.setOnClickListener {
            dialog.dismiss()
        }

        dialog.setContentView(sheet.root)
        dialog.setOnDismissListener {
            confirmSheet = null
            if (!finished) {
                binding.barcodeView.resume()
            }
        }
        confirmSheet = dialog
        dialog.show()
    }

    private fun showDetectionAnimation() {
        binding.infoCard.animate()
            .scaleX(1.05f)
            .scaleY(1.05f)
            .setDuration(90)
            .withEndAction {
                binding.infoCard.animate()
                    .scaleX(1f)
                    .scaleY(1f)
                    .setDuration(90)
                    .start()
            }
            .start()
    }

    private fun deliverResult(text: String) {
        val data = Intent().apply {
            putExtra(Intents.Scan.RESULT, text)
        }
        setResult(Activity.RESULT_OK, data)
        finish()
    }

    private fun hasCameraPermission(): Boolean {
        return ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == CAMERA_PERMISSION_REQUEST) {
            if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) {
                startScanning()
            } else {
                Toast.makeText(this, R.string.scan_cancelled, Toast.LENGTH_SHORT).show()
                setResult(Activity.RESULT_CANCELED, Intent())
                finish()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (!finished) {
            binding.barcodeView.resume()
        }
    }

    override fun onPause() {
        super.onPause()
        binding.barcodeView.pause()
    }

    companion object {
        private const val CAMERA_PERMISSION_REQUEST = 21
    }
}
