<?php
class KPDF {
    function __construct($fpdf) {
        $this->fpdf = $fpdf;
        $this->instructions = [];
        $this->printedLine = [];
    }

    function setColor ($color) {
        $this->instructions[] = ['setColor', $color];
    }

    function printTaggedLn ($line, $options = []) {
        $linespacing = 'single';
        if (isset($options['linespacing'])) {
            $linespacing = $options['linespacing'];
        }
        if (!(isset($options['break']) && $options['break'])) {
            $this->printedLine[] = [$this->fpdf->getFontSize(), $linespacing];
        }
        $this->instructions[] = ['printTaggedLn', $line, $options];
    }

    function hr ($fontsize = 0) {
        $this->instructions[] = ['hr', $fontsize];
        if ($fontsize !== 0) {
            $this->printedLine[] = [$fontsize, 'single'];

        } else {
            $this->printedLine[] = [$this->fpdf->getFontSize(), 'single'];
        }
    }

    function br ($linespacing = 'single') {
        $this->instructions[] = ['br', $linespacing];
        $this->printedLine[] = [$this->fpdf->getFontSize(), $linespacing];
    }

    function tab ($tab) {
        $this->instructions[] = ['tab', $tab];
    }

    function setFontSize ($value) {
        $this->instructions[] = ['setFontSize', $value];
    }

    function out () {
        foreach ($this->instructions as $line) {
            switch($line[0]) {
                case 'setColor': $this->fpdf->setColor($line[1]); break;
                case 'printTaggedLn': $this->fpdf->printTaggedLn($line[1], $line[2]); break;
                case 'hr': $this->fpdf->hr($line[1]); break;
                case 'br': $this->fpdf->br($line[1]); break;
                case 'tab': $this->fpdf->tab($line[1]); break;
                case 'setFontSize': $this->fpdf->setFontSize($line[1]); break;

            }
        }
        $this->instructions = [];
        $this->printedLine = [];
    }

    function getLines () {
        return count($this->printedLine);
    }

    function getHeight ($linespacing = 'single') {
        $height = 0;
        foreach ($this->printedLine as $font) {
            $linespacing = 1;
            if(is_string($font[1])) {
                switch($font[1]) {
                  default: case 'single': $linespacing = 1.20;
                  case '1.5': $linespacing = 1.32;
                  case 'double': $linespacing = 1.45 ;
                }
              } else if(is_numeric($linespacing)) {
                $linespacing = $linespacing / 100;
              }
            
              $height += $linespacing * $font[0];
        }
        return $height;
    }
}