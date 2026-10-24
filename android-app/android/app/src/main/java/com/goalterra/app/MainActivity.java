package com.goalterra.app;

import android.content.res.Configuration;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.view.View;
import androidx.activity.EdgeToEdge;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ThemeBgPlugin.class);
        // Draw behind the system bars. This activity applies the insets itself (see applyInsets) because
        // Capacitor's handler also passes the keyboard inset on to the WebView, which can then shrink twice.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
        // Until the web app reports its theme, use the app's own light or dark background (never the splash image).
        boolean night = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        int bg = night ? 0xFF1B1612 : 0xFFFAF5EE;
        getWindow().setBackgroundDrawable(new ColorDrawable(bg));
        getWindow().getDecorView().setBackgroundColor(bg);
        applyInsets();
    }

    /**
     * Pads the window by the status bar at the top and by whichever is taller at the bottom, the
     * navigation bar or the keyboard, then consumes the insets so the WebView resizes exactly once.
     */
    private void applyInsets() {
        View decor = getWindow().getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets ime = insets.getInsets(WindowInsetsCompat.Type.ime());
            v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(decor);
    }
}
