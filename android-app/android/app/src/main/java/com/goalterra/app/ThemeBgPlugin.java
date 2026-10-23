package com.goalterra.app;

import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Paints the native window behind the web app in the app's current background colour.
 * On WebViews that Capacitor pads for the system bars, that padding shows this colour,
 * so the area under the status bar matches the theme instead of showing the splash image.
 */
@CapacitorPlugin(name = "ThemeBg")
public class ThemeBgPlugin extends Plugin {
    @PluginMethod
    public void setColor(PluginCall call) {
        String value = call.getString("color", "#F3F7F6");
        final int color;
        try {
            color = Color.parseColor(value);
        } catch (IllegalArgumentException e) {
            call.reject("Not a colour: " + value);
            return;
        }
        getActivity().runOnUiThread(() -> {
            getActivity().getWindow().setBackgroundDrawable(new ColorDrawable(color));
            getActivity().getWindow().getDecorView().setBackgroundColor(color);
        });
        call.resolve();
    }
}
