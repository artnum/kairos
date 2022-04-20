<?php
class KPDF {
    function __construct($fpdf) {
        $this->fpdf = $fpdf;
        $this->instructions = [];
        $this->printedLine = 0;
    }

    function setColor ($color) {
        $this->instructions[] = ['setColor', $color];
    }

    function printTaggedLn ($line, $options = []) {
        if (!(isset($options['break']) && $options['break'])) {
            $this->printedLine++;
        }
        $this->instructions[] = ['printTaggedLn', $line, $options];
    }

    function hr () {
        $this->instructions[] = ['hr'];
        $this->printedLine++;
    }

    function br () {
        $this->instructions[] = ['br'];
        $this->printedLine++;
    }

    function tab ($tab) {
        $this->instructions[] = ['tab', $tab];
    }
    function out () {
        foreach ($this->instructions as $line) {
            switch($line[0]) {
                case 'setColor': $this->fpdf->setColor($line[1]); break;
                case 'printTaggedLn': $this->fpdf->printTaggedLn($line[1], $line[2]); break;
                case 'hr': $this->fpdf->hr(); break;
                case 'br': $this->fpdf->br(); break;
                case 'tan': $this->fpdf->tab($line[1]); break;
            }
        }
        $this->instructions = [];
        $this->printedLine = 0;
    }

    function getLines () {
        return $this->printedLine;
    }

    function getHeight ($linespacing = 'single') {
        return $this->fpdf->getLineHeight($linespacing) * $this->printedLine;
    }
}